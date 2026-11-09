import { z } from "zod";
import { exigirSessaoApi, respostaErro, respostaOk } from "@/server/http";
import {
  listarCasAVencer,
  listarEstoqueBaixo,
  listarTrocasProximas,
} from "@/server/services/alertas";

export const dynamic = "force-dynamic";

const diasSchema = z.coerce.number().int().min(0).max(365).default(15);
const janelaSchema = z.union([z.literal(30), z.literal(60), z.literal(90)]).catch(90);

export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    const dias = diasSchema.parse(searchParams.get("dias") ?? undefined);
    const janela = janelaSchema.parse(Number(searchParams.get("janela") ?? 90));

    const [estoqueBaixo, caVencimento, trocas] = await Promise.all([
      listarEstoqueBaixo(),
      listarCasAVencer(janela),
      listarTrocasProximas(dias),
    ]);

    return respostaOk({
      referencia: new Date().toISOString(),
      estoqueBaixo,
      caVencimento,
      trocas,
    });
  } catch (error) {
    return respostaErro(error);
  }
}
