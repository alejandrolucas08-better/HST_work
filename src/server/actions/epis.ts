"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { epiSchema, epiUpdateSchema, reposicaoEstoqueSchema } from "@/lib/validations";
import { isDomainError } from "@/server/services/erros";
import {
  alterarAtivoEpi,
  atualizarEpi,
  criarEpi,
  reporEstoque,
} from "@/server/services/epis";

function revalidarEpis() {
  revalidatePath("/dashboard");
  revalidatePath("/epis");
  revalidatePath("/entregas");
  revalidatePath("/colaboradores");
}

function estadoDeErro(error: unknown): ActionState {
  if (isDomainError(error)) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  throw error;
}

export async function criarEpiAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = epiSchema.safeParse({
    nome: formData.get("nome"),
    numeroCA: formData.get("numeroCA"),
    dataValidadeCA: formData.get("dataValidadeCA"),
    quantidadeEstoque: formData.get("quantidadeEstoque"),
    estoqueMinimo: formData.get("estoqueMinimo"),
    intervaloTrocaDias: formData.get("intervaloTrocaDias"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await criarEpi(parsed.data, session.userId);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarEpis();
  return { status: "success", message: "EPI cadastrado com sucesso." };
}

export async function atualizarEpiAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) return { status: "error", message: "EPI inválido." };

  // Apenas ADMIN altera a situação (ativo/inativo) de um EPI.
  const ativoRaw = formData.get("ativo");
  if (ativoRaw !== null && session.perfil !== "ADMIN") {
    return { status: "error", message: "Apenas administradores podem alterar a situação do EPI." };
  }

  const parsed = epiUpdateSchema.safeParse({
    nome: formData.get("nome") ?? undefined,
    numeroCA: formData.get("numeroCA") ?? undefined,
    dataValidadeCA: formData.get("dataValidadeCA") ?? undefined,
    quantidadeEstoque: formData.get("quantidadeEstoque") ?? undefined,
    estoqueMinimo: formData.get("estoqueMinimo") ?? undefined,
    intervaloTrocaDias: formData.get("intervaloTrocaDias") ?? undefined,
    ...(ativoRaw !== null ? { ativo: ativoRaw === "true" } : {}),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await atualizarEpi(id, parsed.data, session.userId);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarEpis();
  return { status: "success", message: "EPI atualizado com sucesso." };
}

export async function reporEstoqueAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = reposicaoEstoqueSchema.safeParse({
    epiId: formData.get("epiId"),
    quantidade: formData.get("quantidade"),
    motivo: formData.get("motivo"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await reporEstoque(
      parsed.data.epiId,
      parsed.data.quantidade,
      parsed.data.motivo,
      session.userId,
    );
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarEpis();
  return { status: "success", message: "Estoque reposto com sucesso." };
}

export async function alterarAtivoEpiAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  if (session.perfil !== "ADMIN") {
    return { status: "error", message: "Apenas administradores podem arquivar ou reativar EPIs." };
  }

  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) return { status: "error", message: "EPI inválido." };

  try {
    await alterarAtivoEpi(id, ativo);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarEpis();
  return {
    status: "success",
    message: ativo ? "EPI reativado com sucesso." : "EPI arquivado com sucesso.",
  };
}
