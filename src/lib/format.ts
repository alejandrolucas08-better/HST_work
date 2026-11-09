import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatarCpf } from "@/lib/cpf";

export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "America/Sao_Paulo";
const MS_DAY = 86_400_000;

/**
 * Datas "somente dia" (@db.Date) são gravadas à meia-noite UTC. Formatá-las
 * em UTC evita o clássico erro de exibir um dia a menos no Brasil (UTC-3).
 */
const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function formatDateOnly(date: Date | string): string {
  return dateOnlyFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatDateTime(date: Date | string): string {
  return dateTimeFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatLongDate(date: Date | string): string {
  return longDateFormatter.format(typeof date === "string" ? new Date(date) : date);
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNowStrict(typeof date === "string" ? new Date(date) : date, {
    addSuffix: true,
    locale: ptBR,
  });
}

/** Data de hoje (fuso da operação), normalizada para meia-noite UTC. */
export function todayUtcDate(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

export function startOfUtcMonth(): Date {
  const today = todayUtcDate();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

/** Diferença em dias de calendário (positiva = futuro). */
export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const today = todayUtcDate();
  return Math.round((targetUtc - today.getTime()) / MS_DAY);
}

export function isoDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const ano = value.getUTCFullYear();
  const mes = String(value.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(value.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function mascararCpf(cpf: string): string {
  return formatarCpf(cpf);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
