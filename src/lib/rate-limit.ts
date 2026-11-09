import type { SessionUser } from "@/lib/session";

/**
 * Rate limit em memória, por instância. Protege login e validação de PIN contra
 * tentativas automatizadas no MVP. Em produção multicliente, troque por
 * Redis/Upstash (a interface abaixo permanece a mesma).
 */
type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  __hstRateLimitBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.__hstRateLimitBuckets ??
  (globalForRateLimit.__hstRateLimitBuckets = new Map<string, Bucket>());

function limparAntigos(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consultarLimite(
  chave: string,
  maxTentativas: number,
  janelaMs: number,
): { permitido: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  limparAntigos(now);

  const bucket = buckets.get(chave);
  if (!bucket || bucket.resetAt <= now) {
    return { permitido: true, retryAfterSeconds: 0 };
  }

  return {
    permitido: bucket.count < maxTentativas,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function registrarFalha(chave: string, janelaMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(chave);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(chave, { count: 1, resetAt: now + janelaMs });
    return;
  }

  bucket.count += 1;
}

export function limparLimite(chave: string): void {
  buckets.delete(chave);
}

export function ipDaRequisicao(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function chaveLogin(email: string, ip: string): string {
  return `login:${ip}:${email.toLowerCase()}`;
}

/** Bucket adicional por IP: contém ataques distribuídos entre muitos e-mails. */
export function chaveLoginIp(ip: string): string {
  return `login-ip:${ip}`;
}

/** Bucket de PIN por usuário autenticado + colaborador alvo. */
export function chavePin(usuarioId: string, colaboradorId: string): string {
  return `pin:${usuarioId}:${colaboradorId}`;
}

export type RateLimitConfig = {
  maxTentativas: number;
  janelaMs: number;
};

function minutosParaMs(valor: string | undefined, padrao: number): number {
  const minutos = Number(valor ?? padrao);
  return (Number.isFinite(minutos) && minutos > 0 ? minutos : padrao) * 60_000;
}

function tentativas(valor: string | undefined, padrao: number): number {
  const max = Number(valor ?? padrao);
  return Number.isFinite(max) && max > 0 ? Math.floor(max) : padrao;
}

export function configLimiteLogin(): RateLimitConfig {
  return {
    maxTentativas: tentativas(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 8),
    janelaMs: minutosParaMs(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15),
  };
}

export function configLimiteLoginIp(): RateLimitConfig {
  return {
    maxTentativas: tentativas(process.env.AUTH_LOGIN_IP_MAX_ATTEMPTS, 40),
    janelaMs: minutosParaMs(process.env.AUTH_LOGIN_WINDOW_MINUTES, 15),
  };
}

export function configLimitePin(): RateLimitConfig {
  return {
    maxTentativas: tentativas(process.env.AUTH_PIN_MAX_ATTEMPTS, 5),
    janelaMs: minutosParaMs(process.env.AUTH_PIN_WINDOW_MINUTES, 10),
  };
}

/**
 * Consulta vários buckets e retorna o maior tempo de espera. Útil para checar
 * simultaneamente o limite por e-mail e o limite por IP.
 */
export function consultarLimites(
  chaves: string[],
  config: RateLimitConfig,
): { permitido: boolean; retryAfterSeconds: number } {
  let retryAfterSeconds = 0;
  let permitido = true;

  for (const chave of chaves) {
    const resultado = consultarLimite(chave, config.maxTentativas, config.janelaMs);
    if (!resultado.permitido) permitido = false;
    retryAfterSeconds = Math.max(retryAfterSeconds, resultado.retryAfterSeconds);
  }

  return { permitido, retryAfterSeconds };
}

export function registrarFalhas(chaves: string[], janelaMs: number): void {
  for (const chave of chaves) registrarFalha(chave, janelaMs);
}

export function limparLimites(chaves: string[]): void {
  for (const chave of chaves) limparLimite(chave);
}

// Mantém o tipo disponível para quem consome os helpers de sessão da API.
export type { SessionUser };
