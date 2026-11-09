import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hst_session";
export type SessionPerfil = "ADMIN" | "ALMOXARIFE";

export type SessionUser = {
  userId: string;
  nome: string;
  perfil: SessionPerfil;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET ausente ou inválido. Defina uma chave com pelo menos 32 caracteres (openssl rand -base64 32).",
    );
  }
  return new TextEncoder().encode(secret);
}

function getTtlHours(): number {
  const ttl = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 8);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 8;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ nome: user.nome, perfil: user.perfil })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${getTtlHours()}h`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.nome !== "string" ||
      (payload.perfil !== "ADMIN" && payload.perfil !== "ALMOXARIFE")
    ) {
      return null;
    }
    return { userId: payload.sub, nome: payload.nome, perfil: payload.perfil };
  } catch {
    return null;
  }
}
