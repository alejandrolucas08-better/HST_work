import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";
import { DomainError } from "@/server/services/erros";

export async function exigirSessaoApi(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new DomainError("NAO_AUTENTICADO", "Sessão ausente ou expirada.", { status: 401 });
  }
  return session;
}

export function exigirAdmin(session: SessionUser): void {
  if (session.perfil !== "ADMIN") {
    throw new DomainError(
      "SEM_PERMISSAO",
      "Apenas administradores podem executar esta operação.",
      { status: 403 },
    );
  }
}

export function respostaOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function respostaErro(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDACAO",
          message: "Dados inválidos.",
          details: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof DomainError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { details: error.fieldErrors } : {}),
        },
      },
      { status: error.status },
    );
  }

  // Nunca expor stack trace ou detalhes internos ao cliente.
  console.error("[api] erro inesperado:", error);
  return NextResponse.json(
    {
      ok: false,
      error: { code: "ERRO_INTERNO", message: "Erro interno. Tente novamente mais tarde." },
    },
    { status: 500 },
  );
}

export async function lerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DomainError("JSON_INVALIDO", "Corpo da requisição deve ser um JSON válido.", {
      status: 400,
    });
  }
}

export async function lerJsonOpcional(request: Request): Promise<unknown> {
  const texto = await request.text();
  if (!texto.trim()) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new DomainError("JSON_INVALIDO", "Corpo da requisição deve ser um JSON válido.", {
      status: 400,
    });
  }
}
