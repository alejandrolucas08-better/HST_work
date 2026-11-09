import type { Prisma } from "@prisma/client";

// Nunca retornar pinHash/senhaHash em respostas de API.
export const colaboradorResumoSelect = {
  id: true,
  nome: true,
  cpf: true,
  cargo: true,
  setor: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { entregas: { where: { statusDevolucao: "EM_USO" } } },
  },
} satisfies Prisma.ColaboradorSelect;

export const colaboradorDetalheSelect = {
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
      epi: { select: { id: true, nome: true, numeroCA: true } },
      usuario: { select: { id: true, nome: true } },
    },
  },
} satisfies Prisma.ColaboradorSelect;

export const epiResumoSelect = {
  id: true,
  nome: true,
  numeroCA: true,
  dataValidadeCA: true,
  quantidadeEstoque: true,
  estoqueMinimo: true,
  intervaloTrocaDias: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { entregas: { where: { statusDevolucao: "EM_USO" } } },
  },
} satisfies Prisma.EpiSelect;

export const epiDetalheSelect = {
  id: true,
  nome: true,
  numeroCA: true,
  dataValidadeCA: true,
  quantidadeEstoque: true,
  estoqueMinimo: true,
  intervaloTrocaDias: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
  entregas: {
    orderBy: { dataEntrega: "desc" },
    take: 50,
    select: {
      id: true,
      quantidade: true,
      dataEntrega: true,
      dataPrevistaTroca: true,
      statusDevolucao: true,
      pinValidado: true,
      observacoes: true,
      epiNomeEntrega: true,
      numeroCAEntrega: true,
      validadeCAEntrega: true,
      colaborador: { select: { id: true, nome: true, setor: true } },
    },
  },
  movimentacoes: {
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      usuario: { select: { id: true, nome: true } },
      entrega: { select: { id: true } },
    },
  },
} satisfies Prisma.EpiSelect;

export function semSegredo<T extends { pinHash?: unknown; senhaHash?: unknown }>(registro: T) {
  const { pinHash: _pinHash, senhaHash: _senhaHash, ...publico } = registro;
  return publico;
}
