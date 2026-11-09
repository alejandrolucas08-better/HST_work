import type { Prisma } from "@prisma/client";
import { normalizarCpf } from "@/lib/cpf";
import { prisma } from "@/lib/prisma";

export async function getColaboradores(q?: string) {
  const termo = q?.trim();
  const cpf = termo ? normalizarCpf(termo) : "";

  return prisma.colaborador.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { setor: { contains: termo, mode: "insensitive" } },
            { cargo: { contains: termo, mode: "insensitive" } },
            ...(cpf.length >= 3 ? [{ cpf: { contains: cpf } }] : []),
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { entregas: { where: { statusDevolucao: "EM_USO" } } },
      },
    },
  });
}

/**
 * Detalhe para a tela do colaborador. A assinatura Base64 é convertida em
 * booleano (`temAssinatura`): o comprovante completo só é carregado sob demanda
 * em `/api/entregas/[id]`, reduzindo o payload e a exposição do dado.
 */
export async function getColaborador(id: string) {
  const colaborador = await prisma.colaborador.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      cpf: true,
      cargo: true,
      setor: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      entregas: {
        orderBy: { dataEntrega: "desc" },
        select: {
          id: true,
          quantidade: true,
          dataEntrega: true,
          dataPrevistaTroca: true,
          statusDevolucao: true,
          pinValidado: true,
          assinaturaDigital: true,
          observacoes: true,
          epiNomeEntrega: true,
          numeroCAEntrega: true,
          validadeCAEntrega: true,
        },
      },
    },
  });

  if (!colaborador) return null;

  return {
    ...colaborador,
    entregas: colaborador.entregas.map(({ assinaturaDigital, ...entrega }) => ({
      ...entrega,
      temAssinatura: Boolean(assinaturaDigital),
    })),
  };
}

const entregaFichaSelect = {
  id: true,
  quantidade: true,
  dataEntrega: true,
  dataPrevistaTroca: true,
  assinaturaDigital: true,
  pinValidado: true,
  statusDevolucao: true,
  observacoes: true,
  epiNomeEntrega: true,
  numeroCAEntrega: true,
  validadeCAEntrega: true,
} satisfies Prisma.EntregaSelect;

/**
 * Dados completos para a Ficha Individual em PDF, incluindo as assinaturas.
 * Uso restrito à emissão do documento (rota autenticada), nunca a listagens.
 */
export async function getColaboradorFicha(id: string) {
  return prisma.colaborador.findUnique({
    where: { id },
    select: {
      nome: true,
      cpf: true,
      cargo: true,
      setor: true,
      status: true,
      createdAt: true,
      entregas: {
        orderBy: { dataEntrega: "desc" },
        select: entregaFichaSelect,
      },
    },
  });
}
