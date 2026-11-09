import { exigirSessaoApi, respostaErro, respostaOk } from "@/server/http";
import { listarEstoqueBaixo } from "@/server/services/alertas";

export const dynamic = "force-dynamic";

/** EPIs ativos cujo saldo está abaixo (ou igual) ao estoque mínimo. */
export async function GET() {
  try {
    await exigirSessaoApi();
    const itens = await listarEstoqueBaixo();
    return respostaOk({ total: itens.length, itens });
  } catch (error) {
    return respostaErro(error);
  }
}
