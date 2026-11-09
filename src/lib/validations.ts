import { z } from "zod";
import { isCpfValido, normalizarCpf } from "@/lib/cpf";

const uuid = z.string().uuid("Identificador inválido.");
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
  .transform(normalizarCpf)
  .refine(isCpfValido, "CPF inválido.");

const nomeSchema = z.string().trim().min(3, "Informe o nome completo.").max(120);
const cargoSchema = z.string().trim().min(2, "Informe o cargo.").max(80);
const setorSchema = z.string().trim().min(2, "Informe o setor.").max(80);
const statusColaboradorSchema = z.enum(["ATIVO", "INATIVO", "DESLIGADO"]);

const assinaturaSchema = z
  .string()
  .trim()
  .max(700_000, "Assinatura muito grande.")
  .refine(
    (value) => value === "" || /^data:image\/(png|jpeg|svg\+xml);base64,/.test(value),
    "Formato de assinatura inválido.",
  )
  .optional();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").max(72),
});

export const colaboradorSchema = z.object({
  nome: nomeSchema,
  cpf: cpfSchema,
  cargo: cargoSchema,
  setor: setorSchema,
  status: statusColaboradorSchema.default("ATIVO"),
  pin: pinObrigatorio,
});

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
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar.",
  });

const epiBaseSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do EPI.").max(120),
  numeroCA: z.string().trim().min(1, "Informe o número do CA.").max(40),
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
});

export const epiSchema = epiBaseSchema;

export const epiUpdateSchema = epiBaseSchema
  .partial()
  .extend({ ativo: z.boolean().optional() })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Informe ao menos um campo para atualizar.",
  });

export const entregaSchema = z
  .object({
    colaboradorId: uuid,
    epiId: uuid,
    quantidade: z.coerce.number().int().min(1, "Quantidade mínima: 1.").max(999),
    // PIN e assinatura são alternativas: ao menos uma validação digital é exigida.
    pin: pinOpcional,
    assinaturaDigital: assinaturaSchema,
    observacoes: z.string().trim().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.pin && !data.assinaturaDigital) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pin"],
        message: "Informe o PIN do colaborador ou capture a assinatura digital.",
      });
    }
  });

export const reposicaoEstoqueSchema = z.object({
  epiId: uuid,
  quantidade: z.coerce.number().int().min(1).max(100_000),
  motivo: z.string().trim().max(255).optional(),
});

export const devolucaoSchema = z.object({
  reintegrarEstoque: z.boolean().default(false),
});

// -----------------------------------------------------------------------------
// Relatório de conformidade — filtros de período, setor e status do CA.
// Datas chegam da querystring no formato YYYY-MM-DD e são normalizadas para
// meia-noite UTC (mesma convenção das colunas @db.Date do Prisma).
// -----------------------------------------------------------------------------
const dataFiltroSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Data inválida.")
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined));

export const relatorioFiltroSchema = z
  .object({
    inicio: dataFiltroSchema,
    fim: dataFiltroSchema,
    setor: z
      .string()
      .trim()
      .max(80)
      .optional()
      .transform((value) => (value ? value : undefined)),
    caStatus: z.enum(["TODOS", "VALIDO", "A_VENCER", "VENCIDO"]).default("TODOS"),
  })
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
