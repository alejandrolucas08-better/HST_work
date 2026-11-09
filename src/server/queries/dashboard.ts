import {
  LIMITE_ALERTA_CA_DIAS,
  LIMITE_ALERTA_TROCA_DIAS,
} from "@/lib/constants";
import { addDaysUtc, daysUntil, startOfUtcMonth, todayUtcDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const hoje = todayUtcDate();
  const limiteCA = addDaysUtc(hoje, LIMITE_ALERTA_CA_DIAS);
  const limiteTroca = addDaysUtc(hoje, LIMITE_ALERTA_TROCA_DIAS);
  const inicioMes = startOfUtcMonth();

  const [
    colaboradoresAtivos,
    episAtivos,
    entregasNoMes,
    itensEmUso,
    episComCAVencendo,
    todosEpisAtivos,
    proximasTrocas,
    entregasRecentes,
    trocasAtrasadas,
    trocasProximas,
  ] = await Promise.all([
    prisma.colaborador.count({ where: { status: "ATIVO" } }),
    prisma.epi.count({ where: { ativo: true } }),
    prisma.entrega.count({ where: { dataEntrega: { gte: inicioMes } } }),
    prisma.entrega.aggregate({
      where: { statusDevolucao: "EM_USO" },
      _sum: { quantidade: true },
    }),
    prisma.epi.findMany({
      where: { ativo: true, dataValidadeCA: { lte: limiteCA } },
      orderBy: { dataValidadeCA: "asc" },
      take: 8,
      select: {
        id: true,
        nome: true,
        numeroCA: true,
        dataValidadeCA: true,
        quantidadeEstoque: true,
      },
    }),
    prisma.epi.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        numeroCA: true,
        dataValidadeCA: true,
        quantidadeEstoque: true,
        estoqueMinimo: true,
      },
    }),
    prisma.entrega.findMany({
      where: {
        statusDevolucao: "EM_USO",
        dataPrevistaTroca: { lte: limiteTroca },
      },
      orderBy: { dataPrevistaTroca: "asc" },
      take: 8,
      include: {
        colaborador: { select: { id: true, nome: true, setor: true } },
        epi: { select: { id: true, nome: true } },
      },
    }),
    prisma.entrega.findMany({
      orderBy: { dataEntrega: "desc" },
      take: 6,
      include: {
        colaborador: { select: { id: true, nome: true } },
        epi: { select: { id: true, nome: true } },
      },
    }),
    prisma.entrega.count({
      where: { statusDevolucao: "EM_USO", dataPrevistaTroca: { lt: hoje } },
    }),
    prisma.entrega.count({
      where: { statusDevolucao: "EM_USO", dataPrevistaTroca: { lte: limiteTroca } },
    }),
  ]);

  // Comparação entre duas colunas não é expressa diretamente no Prisma;
  // o volume de EPIs ativos é pequeno, então filtramos em memória.
  const estoqueBaixo = todosEpisAtivos.filter(
    (epi) => epi.quantidadeEstoque <= epi.estoqueMinimo,
  );
  const caVencidos = todosEpisAtivos.filter((epi) => daysUntil(epi.dataValidadeCA) < 0).length;
  const caAVencer = todosEpisAtivos.filter((epi) => {
    const dias = daysUntil(epi.dataValidadeCA);
    return dias >= 0 && dias <= LIMITE_ALERTA_CA_DIAS;
  }).length;

  return {
    kpis: {
      colaboradoresAtivos,
      episAtivos,
      entregasNoMes,
      itensEmUso: itensEmUso._sum.quantidade ?? 0,
      caVencidos,
      caAVencer,
      estoqueCritico: estoqueBaixo.length,
      trocasAtrasadas,
      trocasProximas,
      alertas: caVencidos + caAVencer + estoqueBaixo.length + trocasProximas,
    },
    episComCAVencendo,
    estoqueBaixo: estoqueBaixo.slice(0, 8),
    proximasTrocas,
    entregasRecentes,
    hoje,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
