import { exigirSessaoApi, respostaErro, respostaOk } from "@/server/http";
import { getResumoAlertas } from "@/server/services/alertas";

export const dynamic = "force-dynamic";

/** Painel agregado de alertas: estoque, CA (90 dias) e trocas (15 dias). */
export async function GET() {
  try {
    await exigirSessaoApi();
    const resumo = await getResumoAlertas();
    return respostaOk(resumo);
  } catch (error) {
    return respostaErro(error);
  }
}
