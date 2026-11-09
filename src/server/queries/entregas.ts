import { prisma } from "@/lib/prisma";

export async function getEntregas(
  status?: string,
  opcoes: { limit?: number; offset?: number } = {},
) {
  const statusValido =
    status === "EM_USO" || status === "DEVOLVIDO" || status === "TROCADO" || status === "PERDIDO"
      ? status
      : undefined;

  const take = Math.min(Math.max(opcoes.limit ?? 200, 1), 500);
  const skip = Math.max(opcoes.offset ?? 0, 0);

  return prisma.entrega.findMany({
    where: statusValido ? { statusDevolucao: statusValido } : undefined,
    orderBy: { dataEntrega: "desc" },
    take,
    skip,
    include: {
      colaborador: { select: { id: true, nome: true, setor: true } },
      epi: { select: { id: true, nome: true, numeroCA: true } },
      usuario: { select: { nome: true } },
    },
  });
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
