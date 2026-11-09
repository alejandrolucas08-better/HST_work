import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type StatusDevolucao = "EM_USO" | "DEVOLVIDO" | "TROCADO" | "PERDIDO";

/**
 * Seleção explícita: a assinatura Base64 NÃO sai nas listagens (payload
 * pequeno e sem exposição desnecessária de dado biométrico). O modal de
 * comprovante busca o registro individual em `/api/entregas/[id]`.
 */
const entregaListaSelect = {
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
  colaborador: { select: { id: true, nome: true, setor: true } },
  epi: { select: { id: true, nome: true, numeroCA: true } },
  usuario: { select: { nome: true } },
} satisfies Prisma.EntregaSelect;

export async function getEntregas(
  status?: StatusDevolucao,
  opcoes: { limit?: number; offset?: number } = {},
) {
  const take = Math.min(Math.max(opcoes.limit ?? 200, 1), 500);
  const skip = Math.max(opcoes.offset ?? 0, 0);

  const entregas = await prisma.entrega.findMany({
    where: status ? { statusDevolucao: status } : undefined,
    orderBy: { dataEntrega: "desc" },
    take,
    skip,
    select: entregaListaSelect,
  });

  return entregas.map(({ assinaturaDigital, ...entrega }) => ({
    ...entrega,
    temAssinatura: Boolean(assinaturaDigital),
  }));
}

export async function getNovaEntregaData() {
  const [colaboradores, epis] = await Promise.all([
    prisma.colaborador.findMany({
      where: { status: "ATIVO" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cpf: true, cargo: true, setor: true },
    }),
    prisma.epi.findMany({
      where: { ativo: true, quantidadeEstoque: { gt: 0 } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        numeroCA: true,
        dataValidadeCA: true,
        quantidadeEstoque: true,
        intervaloTrocaDias: true,
      },
    }),
  ]);

  return {
    colaboradores,
    epis: epis.map((epi) => ({
      ...epi,
      dataValidadeCA: epi.dataValidadeCA.toISOString(),
    })),
  };
}

export type NovaEntregaData = Awaited<ReturnType<typeof getNovaEntregaData>>;
