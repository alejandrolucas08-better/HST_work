import { destroySession } from "@/lib/auth";
import { respostaOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return respostaOk({ logout: true });
}
