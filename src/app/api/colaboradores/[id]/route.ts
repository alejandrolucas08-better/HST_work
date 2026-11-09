import { prisma } from "@/lib/prisma";
import { colaboradorUpdateSchema } from "@/lib/validations";
import {
  exigirAdmin,
  exigirSessaoApi,
  lerJson,
  respostaErro,
  respostaOk,
} from "@/server/http";
import { colaboradorDetalheSelect, semSegredo } from "@/server/selects";
import {
  arquivarColaborador,
  atualizarColaborador,
} from "@/server/services/colaboradores";
import { DomainError } from "@/server/services/erros";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSessaoApi();
    const { id } = await params;

    const colaborador = await prisma.colaborador.findUnique({
      where: { id },
      select: colaboradorDetalheSelect,
    });

    if (!colaborador) {
      throw new DomainError("COLABORADOR_NAO_ENCONTRADO", "Colaborador não encontrado.", {
        status: 404,
      });
    }

    return respostaOk(colaborador);
  } catch (error) {
    return respostaErro(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigirSessaoApi();
    const { id } = await params;
    const body = await lerJson(request);
    const input = colaboradorUpdateSchema.parse(body);
    // Somente ADMIN pode desligar um colaborador (preserva regra das Server Actions).
    if (input.status === "DESLIGADO") exigirAdmin(session);
    const colaborador = await atualizarColaborador(id, input);
    return respostaOk(semSegredo(colaborador));
  } catch (error) {
    return respostaErro(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigirSessaoApi();
    exigirAdmin(session);
    const { id } = await params;
    const colaborador = await arquivarColaborador(id);

    return respostaOk({
      ...semSegredo(colaborador),
      arquivado: true,
      aviso: "Exclusão lógica: o histórico de entregas foi preservado.",
    });
  } catch (error) {
    return respostaErro(error);
  }
}
