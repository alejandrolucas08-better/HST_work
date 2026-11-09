#!/usr/bin/env node
/**
 * =============================================================================
 * Verificação de vazamento de segredos no bundle do cliente
 * =============================================================================
 * Executado após `next build` (script `postbuild`). Garante que:
 *   1. nenhuma variável sensível (`NEXT_PUBLIC_*`) foi exposta por engano;
 *   2. valores de credenciais de banco, segredo JWT e chaves privadas do
 *      arquivo `.env` não aparecem em `.next/static` (o que o navegador baixa);
 *   3. blocos PEM de chave privada não estão no bundle;
 *   4. arquivos `.env` reais não estão versionados no Git.
 *
 * O script NUNCA imprime o valor do segredo — apenas a chave e o arquivo onde
 * houve correspondência.
 * =============================================================================
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(fileURLToPath(new URL("..", import.meta.url)));
const pastaStatic = join(raiz, ".next", "static");

const CHAVES_CRITICAS =
  /(^|_)(DATABASE_URL|DIRECT_URL|AUTH_SECRET|JWT_SECRET|NEXTAUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|SENTRY_DSN|PRIVATE_KEY|PRIVATE_KEY_BASE64|ENCRYPTION_KEY)$/i;
const CHAVES_SENSIVEIS =
  /(SECRET|PRIVATE|PASSWORD|TOKEN|API_KEY|SERVICE_ROLE|CREDENTIAL)/i;

/**
 * Variáveis NEXT_PUBLIC_* que parecem sensíveis pelo nome, mas são apenas
 * flags de interface (valor booleano) e não carregam segredo algum.
 */
const PUBLICAS_PERMITIDAS = new Set(["NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS"]);

const PLACEHOLDERS = [
  "change-me",
  "dev-only",
  "example",
  "your-",
  "xxxx",
  "localhost",
  "127.0.0.1",
  "hst:hst",
  "[senha]",
  "[ref]",
  "[regiao]",
  "0000000000",
];

const problemas = [];

function lerEnv(caminho) {
  const mapa = new Map();
  const texto = readFileSync(caminho, "utf8");

  for (const linha of texto.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith("#")) continue;

    const separador = limpa.indexOf("=");
    if (separador < 0) continue;

    const chave = limpa.slice(0, separador).trim();
    let valor = limpa.slice(separador + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    mapa.set(chave, valor);
  }

  return mapa;
}

function ehPlaceholder(valor) {
  const minusculo = valor.toLowerCase();
  return PLACEHOLDERS.some((marcador) => minusculo.includes(marcador));
}

/** Extrai a senha de uma URL de banco (evita casar com host/usuário comuns). */
function segredoDaUrl(valor) {
  try {
    const url = new URL(valor);
    if (url.password && url.password.length >= 6 && !ehPlaceholder(url.password)) {
      return url.password;
    }
  } catch {
    // Não é URL; tenta o formato genérico abaixo.
  }

  const correspondencia = /:\/\/(?:[^:/@]+):([^@]+)@/.exec(valor);
  if (correspondencia && correspondencia[1].length >= 6 && !ehPlaceholder(correspondencia[1])) {
    return correspondencia[1];
  }
  return null;
}

function listarArquivos(diretorio) {
  const arquivos = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...listarArquivos(caminho));
      continue;
    }
    if (!entrada.isFile()) continue;
    if (statSync(caminho).size > 25 * 1024 * 1024) continue;
    arquivos.push(caminho);
  }
  return arquivos;
}

if (!existsSync(pastaStatic)) {
  console.warn(
    "[security:secrets] .next/static não encontrado — execute após `next build`. Verificação ignorada.",
  );
  process.exit(0);
}

// 1) Coleta variáveis dos arquivos .env presentes (inclui .env.example para
//    validar que nenhum placeholder sensível virou NEXT_PUBLIC_*).
const arquivosEnv = readdirSync(raiz).filter(
  (nome) => nome === ".env" || nome.startsWith(".env."),
);
const variaveis = new Map();
for (const nome of arquivosEnv) {
  for (const [chave, valor] of lerEnv(join(raiz, nome))) {
    if (!variaveis.has(chave)) variaveis.set(chave, { valor, arquivo: nome });
  }
}

// 2) Variáveis NEXT_PUBLIC_* com nome sensível são um erro por definição.
for (const chave of variaveis.keys()) {
  if (PUBLICAS_PERMITIDAS.has(chave)) continue;
  if (chave.startsWith("NEXT_PUBLIC_") && CHAVES_SENSIVEIS.test(chave)) {
    problemas.push(
      `Variável pública sensível: ${chave}. Renomeie para uma variável server-only (sem NEXT_PUBLIC_).`,
    );
  }
}

// 3) Monta a lista de valores que jamais podem aparecer no bundle.
const valoresProibidos = [];
for (const [chave, { valor, arquivo }] of variaveis) {
  if (!valor || valor.length < 6) continue;
  if (chave.startsWith("SEED_")) continue; // credenciais de demonstração do seed
  if (chave.startsWith("NEXT_PUBLIC_")) continue; // já validado acima

  const critica = CHAVES_CRITICAS.test(chave);
  const sensivel = CHAVES_SENSIVEIS.test(chave);
  if (!critica && !sensivel) continue;
  if (ehPlaceholder(valor)) continue;

  if (/DATABASE_URL|DIRECT_URL/i.test(chave)) {
    const senha = segredoDaUrl(valor);
    if (senha) valoresProibidos.push({ chave, arquivo, valor: senha });
    continue;
  }

  // Chaves privadas PEM: verifica o conteúdo real e também o cabeçalho.
  const valorReal = valor.replace(/\\n/g, "\n");
  valoresProibidos.push({ chave, arquivo, valor: valorReal });
  if (valorReal.length > 40) {
    valoresProibidos.push({ chave, arquivo, valor: valorReal.slice(0, 40) });
  }
}

// 4) Percorre o bundle estático uma única vez.
const arquivosBundle = listarArquivos(pastaStatic);
const conteudos = arquivosBundle.map((caminho) => ({
  caminho: relative(raiz, caminho),
  texto: readFileSync(caminho, "utf8"),
}));

const vistos = new Set();
for (const { chave, arquivo, valor } of valoresProibidos) {
  const assinatura = `${chave}:${valor}`;
  if (vistos.has(assinatura)) continue;
  vistos.add(assinatura);

  const encontrado = conteudos.find(({ texto }) => texto.includes(valor));
  if (encontrado) {
    problemas.push(
      `Valor de ${chave} (definido em ${arquivo}) encontrado no bundle: ${encontrado.caminho}`,
    );
  }
}

// 5) Blocos PEM de chave privada no bundle (mesmo sem variável correspondente).
const marcadoresPem = [
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN EC PRIVATE KEY-----",
  "-----BEGIN OPENSSH PRIVATE KEY-----",
];
for (const { caminho, texto } of conteudos) {
  for (const marcador of marcadoresPem) {
    if (texto.includes(marcador)) {
      problemas.push(`Bloco de chave privada (${marcador}) encontrado em ${caminho}`);
    }
  }
}

// 6) Arquivos .env reais não podem estar versionados.
try {
  const versionados = execFileSync("git", ["ls-files"], {
    cwd: raiz,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split(/\r?\n/)
    .filter((arquivo) => /^\.env($|\.)/.test(arquivo) && arquivo !== ".env.example");

  if (versionados.length > 0) {
    problemas.push(`Arquivo(s) .env versionado(s) no Git: ${versionados.join(", ")}`);
  }
} catch {
  // Git indisponível no ambiente de build: a checagem de versionamento é opcional.
}

if (problemas.length > 0) {
  console.error("\n[security:secrets] FALHA — possíveis segredos expostos no cliente:\n");
  for (const problema of problemas) console.error(`  - ${problema}`);
  console.error("");
  process.exit(1);
}

console.log(
  `[security:secrets] OK — ${arquivosBundle.length} arquivo(s) analisado(s) em .next/static; nenhum segredo crítico encontrado.`,
);
