"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { colaboradorSchema, colaboradorUpdateSchema, uuidSchema } from "@/lib/validations";
import {
  alterarStatusColaborador,
  arquivarColaborador,
  atualizarColaborador,
  criarColaborador,
} from "@/server/services/colaboradores";
import { isDomainError } from "@/server/services/erros";

function revalidarColaboradores() {
  revalidatePath("/dashboard");
  revalidatePath("/colaboradores");
  revalidatePath("/entregas");
}

function estadoDeErro(error: unknown): ActionState {
  if (isDomainError(error)) {
    return { status: "error", message: error.message, fieldErrors: error.fieldErrors };
  }
  throw error;
}

export async function criarColaboradorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  if (String(formData.get("status") ?? "ATIVO") === "DESLIGADO" && session.perfil !== "ADMIN") {
    return { status: "error", message: "Apenas administradores podem cadastrar desligados." };
  }

  const parsed = colaboradorSchema.safeParse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf"),
    cargo: formData.get("cargo"),
    setor: formData.get("setor"),
    status: formData.get("status") ?? "ATIVO",
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await criarColaborador(parsed.data);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarColaboradores();
  return { status: "success", message: "Colaborador cadastrado com sucesso." };
}

export async function atualizarColaboradorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const id = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return { status: "error", message: "Colaborador inválido." };

  const status = String(formData.get("status") ?? "ATIVO");
  if (status === "DESLIGADO" && session.perfil !== "ADMIN") {
    return {
      status: "error",
      message: "Apenas administradores podem desligar colaboradores.",
    };
  }

  const pin = String(formData.get("pin") ?? "").trim();

  const parsed = colaboradorUpdateSchema.safeParse({
    nome: formData.get("nome") ?? undefined,
    cpf: formData.get("cpf") ?? undefined,
    cargo: formData.get("cargo") ?? undefined,
    setor: formData.get("setor") ?? undefined,
    status,
    pin: pin || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await atualizarColaborador(id.data, parsed.data);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarColaboradores();
  return { status: "success", message: "Colaborador atualizado com sucesso." };
}

export async function alterarStatusColaboradorAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const id = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  const status = String(formData.get("status") ?? "");
  if (!id.success || !["ATIVO", "INATIVO", "DESLIGADO"].includes(status)) return;
  if (status === "DESLIGADO" && session.perfil !== "ADMIN") return;

  await alterarStatusColaborador(
    id.data,
    status as "ATIVO" | "INATIVO" | "DESLIGADO",
  );
  revalidarColaboradores();
}

export async function arquivarColaboradorAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (session.perfil !== "ADMIN") {
    return { status: "error", message: "Apenas administradores podem arquivar colaboradores." };
  }

  const id = uuidSchema.safeParse(String(formData.get("id") ?? ""));
  if (!id.success) return { status: "error", message: "Colaborador inválido." };

  try {
    await arquivarColaborador(id.data);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarColaboradores();
  return { status: "success", message: "Colaborador arquivado (desligado)." };
}
