import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";
import { uuidSchema } from "@/lib/validations";
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

/**
 * Valida um parâmetro de rota antes de consultar o banco. Evita que valores
 * malformados cheguem ao Prisma e devolve um 422 consistente.
 */
export function validarIdRota(valor: string, nome = "id"): string {
  const parsed = uuidSchema.safeParse(valor);
  if (!parsed.success) {
    throw new DomainError("IDENTIFICADOR_INVALIDO", "Identificador inválido.", {
      status: 422,
      fieldErrors: { [nome]: ["Identificador inválido."] },
    });
  }
  return parsed.data;
}

/**
 * Rejeita parâmetros repetidos na querystring (parameter pollution).
 * Ex.: `?status=EM_USO&status=DEVOLVIDO` retorna 400 em vez de escolher um.
 */
export function parametroUnico(searchParams: URLSearchParams, nome: string): string | undefined {
  const valores = searchParams.getAll(nome);
  if (valores.length > 1) {
    throw new DomainError(
      "PARAMETRO_DUPLICADO",
      `O parâmetro "${nome}" não pode ser repetido.`,
      { status: 400, fieldErrors: { [nome]: ["Parâmetro repetido."] } },
    );
  }
  return valores[0];
}

export function validarParametrosUnicos(
  searchParams: URLSearchParams,
  nomes: readonly string[],
): void {
  for (const nome of nomes) parametroUnico(searchParams, nome);
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
    const init: ResponseInit = { status: error.status };
    if (error.headers) init.headers = error.headers;

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.fieldErrors ? { details: error.fieldErrors } : {}),
        },
      },
      init,
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
  const contentType = request.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    throw new DomainError("CONTENT_TYPE_INVALIDO", "Envie o corpo como application/json.", {
      status: 415,
    });
  }

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
