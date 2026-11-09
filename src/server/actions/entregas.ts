"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { requireSession } from "@/lib/auth";
import { entregaSchema } from "@/lib/validations";
import { isDomainError } from "@/server/services/erros";
import { registrarDevolucao, registrarEntrega } from "@/server/services/entregas";

function revalidarEntregas() {
  revalidatePath("/dashboard");
  revalidatePath("/entregas");
  revalidatePath("/epis");
  revalidatePath("/colaboradores");
}

function estadoDeErro(error: unknown): ActionState {
  if (isDomainError(error)) {
    return { status: "error", message: error.message, fieldErrors: error.fieldErrors };
  }
  throw error;
}

export async function registrarEntregaAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = entregaSchema.safeParse({
    colaboradorId: formData.get("colaboradorId"),
    epiId: formData.get("epiId"),
    quantidade: formData.get("quantidade"),
    pin: formData.get("pin") ?? "",
    assinaturaDigital: formData.get("assinaturaDigital") ?? "",
    observacoes: formData.get("observacoes") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Corrija os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await registrarEntrega(parsed.data, session);
  } catch (error) {
    return estadoDeErro(error);
  }

  revalidarEntregas();
  redirect("/entregas?sucesso=entrega");
}

export async function registrarDevolucaoAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const entregaId = String(formData.get("entregaId") ?? "");
  const reintegrarEstoque = formData.get("reintegrarEstoque") === "on";
  if (!entregaId) redirect("/entregas?erro=ENTREGA_NAO_ENCONTRADA");

  try {
    await registrarDevolucao(entregaId, reintegrarEstoque, session);
  } catch (error) {
    if (isDomainError(error)) {
      redirect(`/entregas?erro=${encodeURIComponent(error.code)}`);
    }
    throw error;
  }

  revalidarEntregas();
  redirect("/entregas?sucesso=devolucao");
}
