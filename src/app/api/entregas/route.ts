import { entregaSchema, paginacaoSchema, statusDevolucaoSchema } from "@/lib/validations";
import {
  exigirSessaoApi,
  lerJson,
  parametroUnico,
  respostaErro,
  respostaOk,
  validarParametrosUnicos,
} from "@/server/http";
import { getEntregas } from "@/server/queries/entregas";
import { registrarEntrega } from "@/server/services/entregas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    validarParametrosUnicos(searchParams, ["limit", "offset", "status"]);

    const paginacao = paginacaoSchema.parse({
      limit: parametroUnico(searchParams, "limit") ?? undefined,
      offset: parametroUnico(searchParams, "offset") ?? undefined,
    });
    const statusBruto = parametroUnico(searchParams, "status");
    const status = statusBruto === undefined ? undefined : statusDevolucaoSchema.parse(statusBruto);

    const entregas = await getEntregas(status, paginacao);
    return respostaOk(entregas);
  } catch (error) {
    return respostaErro(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await exigirSessaoApi();
    const body = await lerJson(request);
    const input = entregaSchema.parse(body);
    const entrega = await registrarEntrega(input, session);
    return respostaOk(entrega, 201);
  } catch (error) {
    return respostaErro(error);
  }
}
