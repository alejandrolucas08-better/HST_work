export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "HST EPI";
export const SESSION_COOKIE = "hst_session";
export const SESSION_TTL_HOURS = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 8);

// Regras de negócio de alerta (facilmente ajustáveis sem tocar nas queries).
export const LIMITE_ALERTA_CA_DIAS = 30;
export const LIMITE_ALERTA_TROCA_DIAS = 15;

export const PERFIL_LABELS = {
  ADMIN: "Administrador",
  ALMOXARIFE: "Almoxarife",
} as const;

export const STATUS_COLABORADOR_LABELS = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  DESLIGADO: "Desligado",
} as const;

export const STATUS_DEVOLUCAO_LABELS = {
  EM_USO: "Em uso",
  DEVOLVIDO: "Devolvido",
  TROCADO: "Trocado",
  PERDIDO: "Perdido",
} as const;

// Status de conformidade do CA usados no relatório (base: validade atual do EPI).
export const STATUS_CA_LABELS = {
  VALIDO: "CA válido",
  A_VENCER: "CA a vencer",
  VENCIDO: "CA vencido",
} as const;

export type StatusCA = keyof typeof STATUS_CA_LABELS;

export const TIPO_MOVIMENTACAO_LABELS = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste",
} as const;
