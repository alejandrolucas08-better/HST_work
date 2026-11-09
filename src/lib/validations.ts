import { z } from "zod";
import { isCpfValido, normalizarCpf } from "@/lib/cpf";
import {
  ASSINATURA_MAX_CHARS,
  assinaturaDigitalValida,
  normalizarAssinatura,
} from "@/lib/signature";

/**
 * =============================================================================
 * Schemas Zod — única fonte de verdade para entrada de dados
 * =============================================================================
 * Regras aplicadas em TODAS as rotas (API e Server Actions):
 *   - objetos `.strict()`: campos desconhecidos são rejeitados (evita mass
 *     assignment e poluição de parâmetros);
 *   - textos sem caracteres de controle e sem `<`/`>` (defesa em profundidade
 *     contra XSS armazenado; a saída também é escapada pelo React);
 *   - CPF com validação real dos dígitos verificadores;
 *   - assinatura digital validada por magic bytes/tamanho/dimensões;
 *   - UUIDs validados antes de chegarem ao Prisma (o Prisma já parametriza as
 *     queries, então injeção de SQL não é possível — a validação evita erros
 *     internos e payloads malformados).
 * =============================================================================
 */

export const uuidSchema = z.string().trim().uuid("Identificador inválido.");

const CARACTERES_CONTROLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CARACTERES_XSS = /[<>]/;

function textoSeguro(min: number, max: number, mensagemMinimo: string) {
  return z
    .string()
    .trim()
    .min(min, mensagemMinimo)
    .max(max, `Use no máximo ${max} caracteres.`)
    .refine((value) => !CARACTERES_CONTROLE.test(value), "O texto contém caracteres inválidos.")
    .refine((value) => !CARACTERES_XSS.test(value), "O texto não pode conter os caracteres < ou >.");
}

const pinObrigatorio = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, "O PIN deve ter de 4 a 6 dígitos.");
const pinOpcional = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^\d{4,6}$/.test(value), "O PIN deve ter de 4 a 6 dígitos.");
const cpfSchema = z
  .string()
  .trim()
  .transform(normalizarCpf)
  .refine(isCpfValido, "CPF inválido.");

const nomeSchema = textoSeguro(3, 120, "Informe o nome completo.");
const cargoSchema = textoSeguro(2, 80, "Informe o cargo.");
const setorSchema = textoSeguro(2, 80, "Informe o setor.");
export const statusColaboradorSchema = z.enum(["ATIVO", "INATIVO", "DESLIGADO"]);
export const statusDevolucaoSchema = z.enum([
  "EM_USO",
  "DEVOLVIDO",
  "TROCADO",
  "PERDIDO",
]);

/**
 * Assinatura digital: aceita apenas PNG/JPEG reais (ver `src/lib/signature.ts`).
 * O valor final é canônico — MIME e Base64 normalizados antes de persistir.
 */
const assinaturaSchema = z
  .string()
  .trim()
  .max(ASSINATURA_MAX_CHARS, "Assinatura muito grande.")
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => value === undefined || assinaturaDigitalValida(value),
    "Assinatura inválida. Capture novamente usando PNG ou JPEG.",
  )
  .transform((value) => (value ? (normalizarAssinatura(value) ?? undefined) : undefined));

/** Busca textual (q) — limita tamanho e bloqueia payloads de injeção de marcação. */
export const termoBuscaSchema = z
  .string()
  .trim()
  .max(120, "O termo de busca deve ter no máximo 120 caracteres.")
  .refine((value) => !CARACTERES_CONTROLE.test(value), "O termo contém caracteres inválidos.")
  .refine((value) => !CARACTERES_XSS.test(value), "O termo não pode conter < ou >.")
  .optional()
  .transform((value) => (value ? value : undefined));

/** Parâmetros booleanos de querystring: apenas "true"/"false" são aceitos. */
export const parametroBooleanoSchema = z
  .enum(["true", "false"], { errorMap: () => ({ message: "Use 'true' ou 'false'." }) })
  .optional()
  .transform((value) => value === "true");

export const paginacaoSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(180),
    senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").max(72),
  })
  .strict();

export const colaboradorSchema = z
  .object({
    nome: nomeSchema,
    cpf: cpfSchema,
    cargo: cargoSchema,
    setor: setorSchema,
    status: statusColaboradorSchema.default("ATIVO"),
    pin: pinObrigatorio,
  })
  .strict();

export const colaboradorUpdateSchema = z
  .object({
    nome: nomeSchema.optional(),
    cpf: cpfSchema.optional(),
    cargo: cargoSchema.optional(),
    setor: setorSchema.optional(),
    status: statusColaboradorSchema.optional(),
    // Em edição, PIN vazio significa "manter o PIN atual".
    pin: pinOpcional,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar.",
  });

const epiBaseSchema = z
  .object({
    nome: textoSeguro(2, 120, "Informe o nome do EPI."),
    numeroCA: z
      .string()
      .trim()
      .min(1, "Informe o número do CA.")
      .max(40, "Use no máximo 40 caracteres.")
      .regex(/^[0-9A-Za-z./ -]+$/, "O número do CA contém caracteres inválidos."),
    dataValidadeCA: z.coerce.date({ invalid_type_error: "Informe a validade do CA." }),
    quantidadeEstoque: z.coerce
      .number()
      .int("Use um número inteiro.")
      .min(0, "O estoque não pode ser negativo.")
      .max(1_000_000),
    estoqueMinimo: z.coerce
      .number()
      .int("Use um número inteiro.")
      .min(0, "O estoque mínimo não pode ser negativo.")
      .max(1_000_000),
    intervaloTrocaDias: z.coerce
      .number()
      .int("Use um número inteiro.")
      .min(1, "O intervalo deve ser de ao menos 1 dia.")
      .max(3650),
  })
  .strict();

export const epiSchema = epiBaseSchema;

export const epiUpdateSchema = epiBaseSchema
  .partial()
  .extend({ ativo: z.boolean().optional() })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar.",
  });

export const entregaSchema = z
  .object({
    colaboradorId: uuidSchema,
    epiId: uuidSchema,
    quantidade: z.coerce.number().int().min(1, "Quantidade mínima: 1.").max(999),
    // PIN e assinatura são alternativas: ao menos uma validação digital é exigida.
    pin: pinOpcional,
    assinaturaDigital: assinaturaSchema,
    observacoes: z
      .string()
      .trim()
      .max(1000, "Use no máximo 1000 caracteres.")
      .refine(
        (value) => !CARACTERES_CONTROLE.test(value),
        "As observações contêm caracteres inválidos.",
      )
      .refine(
        (value) => !CARACTERES_XSS.test(value),
        "As observações não podem conter < ou >.",
      )
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.pin && !data.assinaturaDigital) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pin"],
        message: "Informe o PIN do colaborador ou capture a assinatura digital.",
      });
    }
  });

export const reposicaoEstoqueSchema = z
  .object({
    epiId: uuidSchema,
    quantidade: z.coerce.number().int().min(1).max(100_000),
    motivo: z
      .string()
      .trim()
      .max(255, "Use no máximo 255 caracteres.")
      .refine((value) => !CARACTERES_XSS.test(value), "O motivo não pode conter < ou >.")
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .strict();

export const devolucaoSchema = z
  .object({
    reintegrarEstoque: z.boolean().default(false),
  })
  .strict();

// -----------------------------------------------------------------------------
// Relatório de conformidade — filtros de período, setor e status do CA.
// Datas chegam da querystring no formato YYYY-MM-DD e são normalizadas para
// meia-noite UTC (mesma convenção das colunas @db.Date do Prisma).
// -----------------------------------------------------------------------------
function ehDataCalendarioValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ano, mes, dia] = value.split("-").map(Number);
  if (ano < 1900 || ano > 2200) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  );
}

const dataFiltroSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine(
    (value) => !value || ehDataCalendarioValida(value),
    "Data inválida. Use o formato AAAA-MM-DD com um dia real do calendário.",
  )
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined));

export const relatorioFiltroSchema = z
  .object({
    inicio: dataFiltroSchema,
    fim: dataFiltroSchema,
    setor: z
      .string()
      .trim()
      .max(80, "Use no máximo 80 caracteres.")
      .refine((value) => !CARACTERES_CONTROLE.test(value), "O setor contém caracteres inválidos.")
      .refine((value) => !CARACTERES_XSS.test(value), "O setor não pode conter < ou >.")
      .optional()
      .transform((value) => (value ? value : undefined)),
    caStatus: z.enum(["TODOS", "VALIDO", "A_VENCER", "VENCIDO"]).default("TODOS"),
  })
  .strict()
  .refine((data) => !data.inicio || !data.fim || data.inicio <= data.fim, {
    message: "A data inicial deve ser anterior ou igual à data final.",
    path: ["inicio"],
  });

export type RelatorioFiltroInput = z.infer<typeof relatorioFiltroSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type ColaboradorInput = z.infer<typeof colaboradorSchema>;
export type ColaboradorUpdateInput = z.infer<typeof colaboradorUpdateSchema>;
export type EpiInput = z.infer<typeof epiSchema>;
export type EpiUpdateInput = z.infer<typeof epiUpdateSchema>;
export type EntregaInput = z.infer<typeof entregaSchema>;
