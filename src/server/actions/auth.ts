"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import {
  chaveLogin,
  configLimiteLogin,
  consultarLimite,
  ipDaRequisicao,
  limparLimite,
  registrarFalha,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import { autenticarUsuario } from "@/server/services/auth";
import { isDomainError } from "@/server/services/erros";

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ip = ipDaRequisicao(await headers());
  const chave = chaveLogin(parsed.data.email, ip);
  const { maxTentativas, janelaMs } = configLimiteLogin();
  const limite = consultarLimite(chave, maxTentativas, janelaMs);

  if (!limite.permitido) {
    return {
      status: "error",
      message: `Muitas tentativas de login. Aguarde aproximadamente ${Math.ceil(
        limite.retryAfterSeconds / 60,
      )} minuto(s) e tente novamente.`,
    };
  }

  try {
    const usuario = await autenticarUsuario(parsed.data.email, parsed.data.senha);
    limparLimite(chave);

    await createSession({
      userId: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    });
  } catch (error) {
    if (isDomainError(error)) {
      if (error.code === "CREDENCIAIS_INVALIDAS") {
        registrarFalha(chave, janelaMs);
      }
      return { status: "error", message: error.message };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
