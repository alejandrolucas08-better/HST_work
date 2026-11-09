import type { SessionUser } from "@/lib/session";

/**
 * Rate limit em memória, por instância. Protege o login contra tentativas
 * automatizadas no MVP. Em produção multicliente, troque por Redis/Upstash
 * (a interface abaixo permanece a mesma).
 */
type Bucket = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  __hstLoginBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForRateLimit.__hstLoginBuckets ??
  (globalForRateLimit.__hstLoginBuckets = new Map<string, Bucket>());

function limparAntigos(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consultarLimite(
  chave: string,
  maxTentativas: number,
  janelaMs: number,
): { permitido: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  limparAntigos(now);

  const bucket = buckets.get(chave);
  if (!bucket || bucket.resetAt <= now) {
    return { permitido: true, retryAfterSeconds: 0 };
  }

  return {
    permitido: bucket.count < maxTentativas,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function registrarFalha(chave: string, janelaMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(chave);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(chave, { count: 1, resetAt: now + janelaMs });
    return;
  }

  bucket.count += 1;
}

export function limparLimite(chave: string): void {
  buckets.delete(chave);
}

export function ipDaRequisicao(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function chaveLogin(email: string, ip: string): string {
  return `login:${ip}:${email.toLowerCase()}`;
}

export type LoginRateLimitConfig = {
  maxTentativas: number;
  janelaMs: number;
};

export function configLimiteLogin(): LoginRateLimitConfig {
  const max = Number(process.env.AUTH_LOGIN_MAX_ATTEMPTS ?? 8);
  const minutos = Number(process.env.AUTH_LOGIN_WINDOW_MINUTES ?? 15);
  return {
    maxTentativas: Number.isFinite(max) && max > 0 ? max : 8,
    janelaMs: (Number.isFinite(minutos) && minutos > 0 ? minutos : 15) * 60_000,
  };
}

// Mantém o tipo disponível para quem consome os helpers de sessão da API.
export type { SessionUser };
