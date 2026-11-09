import { prisma } from "@/lib/prisma";
import { epiUpdateSchema } from "@/lib/validations";
import {
  exigirAdmin,
  exigirSessaoApi,
  lerJson,
  respostaErro,
  respostaOk,
  validarIdRota,
} from "@/server/http";
import { epiDetalheSelect } from "@/server/selects";
import { alterarAtivoEpi, atualizarEpi } from "@/server/services/epis";
import { DomainError } from "@/server/services/erros";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSessaoApi();
    const id = validarIdRota((await params).id);

    const epi = await prisma.epi.findUnique({ where: { id }, select: epiDetalheSelect });
    if (!epi) {
      throw new DomainError("EPI_NAO_ENCONTRADO", "EPI não encontrado.", { status: 404 });
    }

    return respostaOk(epi);
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
    const id = validarIdRota((await params).id);
    const body = await lerJson(request);
    const input = epiUpdateSchema.parse(body);
    // Situação (ativo/inativo) é uma decisão administrativa.
    if (input.ativo !== undefined) exigirAdmin(session);
    const epi = await atualizarEpi(id, input, session.userId);
    return respostaOk(epi);
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
    const id = validarIdRota((await params).id);
    const epi = await alterarAtivoEpi(id, false);

    return respostaOk({
      ...epi,
      arquivado: true,
      aviso: "Exclusão lógica: histórico e movimentações foram preservados.",
    });
  } catch (error) {
    return respostaErro(error);
  }
}
