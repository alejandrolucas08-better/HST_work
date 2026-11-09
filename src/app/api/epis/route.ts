import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { epiSchema } from "@/lib/validations";
import { exigirSessaoApi, lerJson, respostaErro, respostaOk } from "@/server/http";
import { epiResumoSelect } from "@/server/selects";
import { criarEpi } from "@/server/services/epis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const incluirInativos = searchParams.get("incluirInativos") === "true";
    const somenteEstoqueBaixo = searchParams.get("estoqueBaixo") === "true";

    const where: Prisma.EpiWhereInput = {};
    if (!incluirInativos) where.ativo = true;
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: "insensitive" } },
        { numeroCA: { contains: q, mode: "insensitive" } },
      ];
    }

    const epis = await prisma.epi.findMany({
      where,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: epiResumoSelect,
    });

    // Comparação de colunas em memória; o catálogo de EPIs é pequeno.
    const data = somenteEstoqueBaixo
      ? epis.filter((epi) => epi.quantidadeEstoque <= epi.estoqueMinimo)
      : epis;

    return respostaOk(data);
  } catch (error) {
    return respostaErro(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await exigirSessaoApi();
    const body = await lerJson(request);
    const input = epiSchema.parse(body);
    const epi = await criarEpi(input, session.userId);
    return respostaOk(epi, 201);
  } catch (error) {
    return respostaErro(error);
  }
}
