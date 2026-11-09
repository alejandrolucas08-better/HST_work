import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EpiInput, EpiUpdateInput } from "@/lib/validations";
import { DomainError } from "./erros";

function tratarCaDuplicado(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new DomainError("CA_DUPLICADO", "Já existe um EPI com este número de CA.", {
      status: 409,
      fieldErrors: { numeroCA: ["CA já cadastrado."] },
    });
  }
  throw error;
}

export async function criarEpi(input: EpiInput, usuarioId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const epi = await tx.epi.create({ data: input });

      if (epi.quantidadeEstoque > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            epiId: epi.id,
            usuarioId,
            tipo: "ENTRADA",
            quantidade: epi.quantidadeEstoque,
            motivo: "Estoque inicial do cadastro",
          },
        });
      }

      return epi;
    });
  } catch (error) {
    tratarCaDuplicado(error);
  }
}

export async function atualizarEpi(
  id: string,
  input: EpiUpdateInput,
  usuarioId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existente = await tx.epi.findUnique({ where: { id } });
      if (!existente) {
        throw new DomainError("EPI_NAO_ENCONTRADO", "EPI não encontrado.", { status: 404 });
      }

      const { quantidadeEstoque, ...restante } = input;
      const delta =
        quantidadeEstoque !== undefined
          ? quantidadeEstoque - existente.quantidadeEstoque
          : 0;

      const epi = await tx.epi.update({
        where: { id },
        data: {
          ...restante,
          ...(quantidadeEstoque !== undefined ? { quantidadeEstoque } : {}),
        },
      });

      // Alteração manual de saldo precisa ficar na auditoria, como qualquer saída.
      if (delta !== 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            epiId: id,
            usuarioId,
            tipo: "AJUSTE",
            quantidade: Math.abs(delta),
            motivo:
              delta > 0 ? "Ajuste manual de estoque (entrada)" : "Ajuste manual de estoque (saída)",
          },
        });
      }

      return epi;
    });
  } catch (error) {
    tratarCaDuplicado(error);
  }
}

export async function reporEstoque(
  epiId: string,
  quantidade: number,
  motivo: string | undefined,
  usuarioId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.epi.findUnique({
      where: { id: epiId },
      select: { id: true },
    });
    if (!existente) {
      throw new DomainError("EPI_NAO_ENCONTRADO", "EPI não encontrado.", { status: 404 });
    }

    const epi = await tx.epi.update({
      where: { id: epiId },
      data: { quantidadeEstoque: { increment: quantidade } },
    });

    await tx.movimentacaoEstoque.create({
      data: {
        epiId,
        usuarioId,
        tipo: "ENTRADA",
        quantidade,
        motivo: motivo || "Reposição de estoque",
      },
    });

    return epi;
  });
}

export async function alterarAtivoEpi(id: string, ativo: boolean) {
  const existente = await prisma.epi.findUnique({ where: { id }, select: { id: true } });
  if (!existente) {
    throw new DomainError("EPI_NAO_ENCONTRADO", "EPI não encontrado.", { status: 404 });
  }
  return prisma.epi.update({ where: { id }, data: { ativo } });
}

/**
 * Exclusão lógica: preserva entregas e movimentações para auditoria.
 * O EPI desativado não pode ser usado em novas entregas.
 */
export async function arquivarEpi(id: string) {
  return alterarAtivoEpi(id, false);
}
