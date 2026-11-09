import { addDaysUtc, daysUntil, startOfUtcMonth, todayUtcDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type JanelaCA = 30 | 60 | 90;

export async function listarEstoqueBaixo() {
  const epis = await prisma.epi.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      numeroCA: true,
      quantidadeEstoque: true,
      estoqueMinimo: true,
      intervaloTrocaDias: true,
    },
  });

  // Comparação entre colunas não é suportada diretamente pelo Prisma.
  return epis
    .filter((epi) => epi.quantidadeEstoque <= epi.estoqueMinimo)
    .map((epi) => ({
      ...epi,
      deficit: epi.estoqueMinimo - epi.quantidadeEstoque,
      zerado: epi.quantidadeEstoque === 0,
    }));
}

/**
 * Classifica CAs por faixa de vencimento. Um EPI aparece em apenas uma faixa,
 * o que evita duplicidade nos totais do painel e dos alertas.
 */
export async function listarCasAVencer(janela: JanelaCA = 90) {
  const hoje = todayUtcDate();
  const limite = addDaysUtc(hoje, janela);

  const epis = await prisma.epi.findMany({
    where: { ativo: true, dataValidadeCA: { lte: limite } },
    orderBy: { dataValidadeCA: "asc" },
    select: {
      id: true,
      nome: true,
      numeroCA: true,
      dataValidadeCA: true,
      quantidadeEstoque: true,
      estoqueMinimo: true,
    },
  });

  const comDias = epis.map((epi) => ({
    ...epi,
    diasRestantes: daysUntil(epi.dataValidadeCA),
  }));

  const vencidos = comDias.filter((epi) => epi.diasRestantes < 0);
  const ate30 = comDias.filter((epi) => epi.diasRestantes >= 0 && epi.diasRestantes <= 30);
  const de31a60 = comDias.filter((epi) => epi.diasRestantes >= 31 && epi.diasRestantes <= 60);
  const de61a90 = comDias.filter((epi) => epi.diasRestantes >= 61 && epi.diasRestantes <= 90);

  return {
    janela,
    total: comDias.length,
    vencidos,
    ate30,
    de31a60,
    de61a90,
    epis: comDias,
  };
}

export async function listarTrocasProximas(janelaDias = 15) {
  const hoje = todayUtcDate();
  const limite = addDaysUtc(hoje, janelaDias);

  const entregas = await prisma.entrega.findMany({
    where: {
      statusDevolucao: "EM_USO",
      dataPrevistaTroca: { lte: limite },
    },
    orderBy: { dataPrevistaTroca: "asc" },
    include: {
      colaborador: {
        select: { id: true, nome: true, cpf: true, cargo: true, setor: true, status: true },
      },
      epi: { select: { id: true, nome: true, numeroCA: true } },
    },
  });

  return entregas.map((entrega) => {
    const dias = daysUntil(entrega.dataPrevistaTroca);
    return {
      ...entrega,
      diasRestantes: dias,
      situacao: dias < 0 ? ("ATRASADA" as const) : dias === 0 ? ("HOJE" as const) : ("PROXIMA" as const),
    };
  });
}

export async function getResumoAlertas() {
  const agora = todayUtcDate();
  const inicioMes = startOfUtcMonth();

  const [estoqueBaixo, cas, trocas, entregasMes] = await Promise.all([
    listarEstoqueBaixo(),
    listarCasAVencer(90),
    listarTrocasProximas(15),
    prisma.entrega.count({ where: { dataEntrega: { gte: inicioMes } } }),
  ]);

  return {
    geradoEm: new Date().toISOString(),
    referencia: agora.toISOString().slice(0, 10),
    estoqueBaixo: {
      total: estoqueBaixo.length,
      itens: estoqueBaixo,
    },
    caVencimento: {
      total: cas.total,
      vencidos: cas.vencidos.length,
      ate30: cas.ate30.length,
      de31a60: cas.de31a60.length,
      de61a90: cas.de61a90.length,
      itens: cas.epis,
    },
    trocasProximas: {
      total: trocas.length,
      atrasadas: trocas.filter((item) => item.situacao === "ATRASADA").length,
      hoje: trocas.filter((item) => item.situacao === "HOJE").length,
      itens: trocas,
    },
    entregasNoMes: entregasMes,
  };
}
