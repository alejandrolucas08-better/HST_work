import { prisma } from "@/lib/prisma";
import {
  LIMITE_ALERTA_CA_DIAS,
  type StatusCA,
} from "@/lib/constants";
import { addDaysUtc, daysUntil, todayUtcDate } from "@/lib/format";
import { relatorioFiltroSchema, type RelatorioFiltroInput } from "@/lib/validations";
import { DomainError } from "@/server/services/erros";

/**
 * =============================================================================
 * Consulta do Relatório de Conformidade
 * =============================================================================
 * Regra de status do CA: o relatório é uma fotografia da conformidade ATUAL,
 * portanto usa `epi.dataValidadeCA` (cadastro vigente). O número do CA e a
 * validade exibidos como "na entrega" vêm dos snapshots gravados na própria
 * entrega, preservando o histórico do ato.
 *
 * O período filtra por `dataEntrega`; o fim é inclusivo (comparação usa
 * `lt` do dia seguinte para não perder entregas feitas após 00:00).
 * =============================================================================
 */

export type LinhaRelatorio = {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorCpf: string;
  setor: string;
  cargo: string;
  epiNome: string;
  numeroCA: string;
  validadeCAEntrega: Date;
  validadeCAAtual: Date;
  statusCa: StatusCA;
  quantidade: number;
  dataEntrega: Date;
  dataPrevistaTroca: Date;
  statusDevolucao: "EM_USO" | "DEVOLVIDO" | "TROCADO" | "PERDIDO";
  usuarioNome: string;
  pinValidado: boolean;
  temAssinatura: boolean;
  observacoes: string | null;
};

export type ResumoRelatorio = {
  totalEntregas: number;
  totalItens: number;
  colaboradores: number;
  caValido: number;
  caAVencer: number;
  caVencido: number;
  emUso: number;
  finalizadas: number;
};

export type RelatorioConformidade = {
  filtros: RelatorioFiltroInput;
  linhas: LinhaRelatorio[];
  resumo: ResumoRelatorio;
  setores: string[];
  geradoEm: Date;
};

/** Classifica a validade do CA em válido, a vencer (30 dias) ou vencido. */
export function statusCaDeValidade(validade: Date | string): StatusCA {
  const dias = daysUntil(validade);
  if (dias < 0) return "VENCIDO";
  if (dias <= LIMITE_ALERTA_CA_DIAS) return "A_VENCER";
  return "VALIDO";
}

/** Normaliza searchParams (URLSearchParams ou objeto do Next) para o schema Zod. */
export function filtrosDeParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): RelatorioFiltroInput {
  const nomes = ["inicio", "fim", "setor", "caStatus"] as const;
  const duplicado = nomes.find((nome) =>
    params instanceof URLSearchParams
      ? params.getAll(nome).length > 1
      : Array.isArray(params[nome]),
  );
  if (duplicado) {
    throw new DomainError(
      "PARAMETRO_DUPLICADO",
      `O parâmetro "${duplicado}" não pode ser repetido.`,
      { status: 400, fieldErrors: { [duplicado]: ["Parâmetro repetido."] } },
    );
  }

  const bruto =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : Object.fromEntries(
          Object.entries(params).map(([chave, valor]) => [
            chave,
            Array.isArray(valor) ? valor[0] : valor,
          ]),
        );

  return relatorioFiltroSchema.parse({
    inicio: bruto.inicio,
    fim: bruto.fim,
    setor: bruto.setor,
    caStatus: bruto.caStatus,
  });
}

export async function getRelatorioConformidade(
  filtros: RelatorioFiltroInput,
): Promise<RelatorioConformidade> {
  const hoje = todayUtcDate();
  const limite = addDaysUtc(hoje, LIMITE_ALERTA_CA_DIAS);

  // Monta o WHERE combinando período, setor e status atual do CA.
  const where: {
    dataEntrega?: { gte?: Date; lt?: Date };
    colaborador?: { setor: string };
    epi?: { dataValidadeCA?: { lt?: Date; gte?: Date; lte?: Date; gt?: Date } };
  } = {};

  if (filtros.inicio || filtros.fim) {
    where.dataEntrega = {
      ...(filtros.inicio ? { gte: filtros.inicio } : {}),
      ...(filtros.fim ? { lt: addDaysUtc(filtros.fim, 1) } : {}),
    };
  }

  if (filtros.setor) where.colaborador = { setor: filtros.setor };

  if (filtros.caStatus === "VENCIDO") {
    where.epi = { dataValidadeCA: { lt: hoje } };
  } else if (filtros.caStatus === "A_VENCER") {
    where.epi = { dataValidadeCA: { gte: hoje, lte: limite } };
  } else if (filtros.caStatus === "VALIDO") {
    where.epi = { dataValidadeCA: { gt: limite } };
  }

  const [entregas, setoresBrutos] = await Promise.all([
    prisma.entrega.findMany({
      where,
      orderBy: [{ dataEntrega: "desc" }, { createdAt: "desc" }],
      include: {
        colaborador: {
          select: { id: true, nome: true, cpf: true, setor: true, cargo: true },
        },
        epi: { select: { dataValidadeCA: true } },
        usuario: { select: { nome: true } },
      },
    }),
    prisma.colaborador.findMany({
      distinct: ["setor"],
      orderBy: { setor: "asc" },
      select: { setor: true },
    }),
  ]);

  const linhas: LinhaRelatorio[] = entregas.map((entrega) => ({
    id: entrega.id,
    colaboradorId: entrega.colaborador.id,
    colaboradorNome: entrega.colaborador.nome,
    colaboradorCpf: entrega.colaborador.cpf,
    setor: entrega.colaborador.setor,
    cargo: entrega.colaborador.cargo,
    epiNome: entrega.epiNomeEntrega,
    numeroCA: entrega.numeroCAEntrega,
    validadeCAEntrega: entrega.validadeCAEntrega,
    validadeCAAtual: entrega.epi.dataValidadeCA,
    statusCa: statusCaDeValidade(entrega.epi.dataValidadeCA),
    quantidade: entrega.quantidade,
    dataEntrega: entrega.dataEntrega,
    dataPrevistaTroca: entrega.dataPrevistaTroca,
    statusDevolucao: entrega.statusDevolucao,
    usuarioNome: entrega.usuario.nome,
    pinValidado: entrega.pinValidado,
    temAssinatura: Boolean(entrega.assinaturaDigital),
    observacoes: entrega.observacoes,
  }));

  const resumo: ResumoRelatorio = {
    totalEntregas: linhas.length,
    totalItens: linhas.reduce((soma, linha) => soma + linha.quantidade, 0),
    colaboradores: new Set(linhas.map((linha) => linha.colaboradorId)).size,
    caValido: linhas.filter((linha) => linha.statusCa === "VALIDO").length,
    caAVencer: linhas.filter((linha) => linha.statusCa === "A_VENCER").length,
    caVencido: linhas.filter((linha) => linha.statusCa === "VENCIDO").length,
    emUso: linhas.filter((linha) => linha.statusDevolucao === "EM_USO").length,
    finalizadas: linhas.filter((linha) => linha.statusDevolucao !== "EM_USO").length,
  };

  return {
    filtros,
    linhas,
    resumo,
    setores: setoresBrutos.map((item) => item.setor),
    geradoEm: new Date(),
  };
}

/** Rótulo humano do período aplicado (usado no PDF e na tela). */
export function descreverPeriodo(filtros: RelatorioFiltroInput): string {
  if (filtros.inicio && filtros.fim) {
    return `${filtros.inicio.toLocaleDateString("pt-BR", { timeZone: "UTC" })} a ${filtros.fim.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
  }
  if (filtros.inicio) {
    return `A partir de ${filtros.inicio.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
  }
  if (filtros.fim) {
    return `Até ${filtros.fim.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
  }
  return "Todo o histórico";
}
