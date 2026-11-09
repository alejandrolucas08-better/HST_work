import type { Prisma } from "@prisma/client";
import { normalizarCpf } from "@/lib/cpf";
import { prisma } from "@/lib/prisma";
import {
  colaboradorSchema,
  statusColaboradorSchema,
  termoBuscaSchema,
} from "@/lib/validations";
import {
  exigirAdmin,
  exigirSessaoApi,
  lerJson,
  parametroUnico,
  respostaErro,
  respostaOk,
  validarParametrosUnicos,
} from "@/server/http";
import { colaboradorResumoSelect, semSegredo } from "@/server/selects";
import { criarColaborador } from "@/server/services/colaboradores";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    validarParametrosUnicos(searchParams, ["q", "status"]);

    const q = termoBuscaSchema.parse(parametroUnico(searchParams, "q"));
    const statusBruto = parametroUnico(searchParams, "status");
    const status =
      statusBruto === undefined ? undefined : statusColaboradorSchema.parse(statusBruto);
    const cpf = q ? normalizarCpf(q) : "";

    const where: Prisma.ColaboradorWhereInput = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: "insensitive" } },
        { setor: { contains: q, mode: "insensitive" } },
        { cargo: { contains: q, mode: "insensitive" } },
        ...(cpf.length >= 3 ? [{ cpf: { contains: cpf } }] : []),
      ];
    }

    const colaboradores = await prisma.colaborador.findMany({
      where,
      orderBy: { nome: "asc" },
      select: colaboradorResumoSelect,
    });

    return respostaOk(colaboradores);
  } catch (error) {
    return respostaErro(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await exigirSessaoApi();
    const body = await lerJson(request);
    const input = colaboradorSchema.parse(body);
    // Cadastrar já como desligado é uma operação restrita a administradores.
    if (input.status === "DESLIGADO") exigirAdmin(session);
    const colaborador = await criarColaborador(input);
    return respostaOk(semSegredo(colaborador), 201);
  } catch (error) {
    return respostaErro(error);
  }
}
