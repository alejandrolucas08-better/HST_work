import { NextResponse, type NextRequest } from "next/server";

/**
 * =============================================================================
 * CORS restritivo para /api/*
 * =============================================================================
 * A aplicação é same-origin por padrão. Origens externas só são aceitas se
 * listadas explicitamente em `APP_URL` ou `CORS_ALLOWED_ORIGINS` (separadas
 * por vírgula). Requisições sem cabeçalho `Origin` (server-to-server, curl)
 * seguem normalmente — a autenticação continua obrigatória nas rotas.
 *
 * Preflight (OPTIONS) de origem não autorizada recebe 403 sem chegar à rota.
 * Respostas autorizadas devolvem `Vary: Origin` para não envenenar caches.
 * =============================================================================
 */
function normalizarOrigem(valor: string | undefined | null): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor.trim());
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

const origensConfiguradas = new Set(
  [
    normalizarOrigem(process.env.APP_URL),
    ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origem) => normalizarOrigem(origem)),
  ].filter((origem): origem is string => Boolean(origem)),
);

const METODOS = "GET,POST,PATCH,DELETE,OPTIONS";

export default function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Navegação/SSR e chamadas server-to-server não enviam Origin.
  if (!origin) return NextResponse.next();

  const origemNormalizada = normalizarOrigem(origin);
  const mesmaOrigem = origemNormalizada === request.nextUrl.origin.toLowerCase();
  const permitida =
    Boolean(origemNormalizada) &&
    (mesmaOrigem || origensConfiguradas.has(origemNormalizada as string));

  if (!permitida) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 403 });
    }
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "ORIGEM_NAO_PERMITIDA",
          message: "Origem não autorizada para acessar esta API.",
        },
      },
      { status: 403 },
    );
  }

  const headers = new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Expose-Headers": "Content-Disposition, Retry-After",
    Vary: "Origin",
  });

  if (request.method === "OPTIONS") {
    headers.set("Access-Control-Allow-Methods", METODOS);
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "600");
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
