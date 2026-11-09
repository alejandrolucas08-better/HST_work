import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const ttlHours = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 8);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: (Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 8) * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

/** Verifica apenas a assinatura/expiração do JWT (sem consultar o banco). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Use em páginas e Server Actions: garante sessão ou redireciona para o login. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
