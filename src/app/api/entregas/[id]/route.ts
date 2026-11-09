import { exigirSessaoApi, respostaErro, respostaOk, validarIdRota } from "@/server/http";
import { obterEntrega } from "@/server/services/entregas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSessaoApi();
    const id = validarIdRota((await params).id);
    const entrega = await obterEntrega(id);
    return respostaOk(entrega);
  } catch (error) {
    return respostaErro(error);
  }
}
