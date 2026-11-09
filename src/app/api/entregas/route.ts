import { z } from "zod";
import { entregaSchema } from "@/lib/validations";
import { exigirSessaoApi, lerJson, respostaErro, respostaOk } from "@/server/http";
import { getEntregas } from "@/server/queries/entregas";
import { registrarEntrega } from "@/server/services/entregas";

export const dynamic = "force-dynamic";

const paginacaoSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    const paginacao = paginacaoSchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const entregas = await getEntregas(searchParams.get("status") ?? undefined, paginacao);
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
