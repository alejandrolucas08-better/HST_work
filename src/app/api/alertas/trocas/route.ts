import { z } from "zod";
import {
  exigirSessaoApi,
  parametroUnico,
  respostaErro,
  respostaOk,
  validarParametrosUnicos,
} from "@/server/http";
import { listarTrocasProximas } from "@/server/services/alertas";

export const dynamic = "force-dynamic";

const diasSchema = z.coerce.number().int().min(0).max(365).default(15);

/**
 * GET /api/alertas/trocas?dias=15
 * Entregas em uso com troca prevista até N dias (inclui atrasadas).
 */
export async function GET(request: Request) {
  try {
    await exigirSessaoApi();
    const { searchParams } = new URL(request.url);
    validarParametrosUnicos(searchParams, ["dias"]);

    const dias = diasSchema.parse(parametroUnico(searchParams, "dias") ?? undefined);
    const itens = await listarTrocasProximas(dias);

    return respostaOk({
      janelaDias: dias,
      total: itens.length,
      atrasadas: itens.filter((item) => item.situacao === "ATRASADA").length,
      itens,
    });
  } catch (error) {
    return respostaErro(error);
  }
}
