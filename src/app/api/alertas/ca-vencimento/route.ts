import { z } from "zod";
import {
  exigirSessaoApi,
  parametroUnico,
  respostaErro,
  respostaOk,
  validarParametrosUnicos,
} from "@/server/http";
import { listarCasAVencer } from "@/server/services/alertas";

export const dynamic = "force-dynamic";

const janelaSchema = z.union([z.literal(30), z.literal(60), z.literal(90)]);

/**
 * GET /api/alertas/ca-vencimento?janela=30|60|90
 * Retorna CAs vencidos e agrupados por faixa (0-30, 31-60, 61-90 dias).
 */
export async function GET(request: Request) {
  try {
    await exigirSessaoApi();
    const { searchParams } = new URL(request.url);
    validarParametrosUnicos(searchParams, ["janela"]);

    const janela = janelaSchema.parse(Number(parametroUnico(searchParams, "janela") ?? 90));
    const resultado = await listarCasAVencer(janela);
    return respostaOk(resultado);
  } catch (error) {
    return respostaErro(error);
  }
}
