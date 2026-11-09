import { devolucaoSchema } from "@/lib/validations";
import {
  exigirSessaoApi,
  lerJsonOpcional,
  respostaErro,
  respostaOk,
} from "@/server/http";
import { registrarDevolucao } from "@/server/services/entregas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigirSessaoApi();
    const { id } = await params;
    const body = await lerJsonOpcional(request);
    const input = devolucaoSchema.parse(body);
    const entrega = await registrarDevolucao(id, input.reintegrarEstoque, session);
    return respostaOk(entrega);
  } catch (error) {
    return respostaErro(error);
  }
}
