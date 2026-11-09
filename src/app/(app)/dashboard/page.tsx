import { DashboardView, type DashboardViewData } from "@/components/dashboard/dashboard-view";
import { getDashboardData } from "@/server/queries/dashboard";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const data = await getDashboardData();

  /*
   * Server Components só podem passar dados serializáveis para Client
   * Components. Convertemos as datas para ISO aqui e deixamos toda a animação
   * e interação (filtros/alertas) no componente cliente.
   */
  const view: DashboardViewData = {
    hoje: data.hoje.toISOString(),
    kpis: data.kpis,
    caAlerts: data.episComCAVencendo.map((epi) => ({
      id: epi.id,
      nome: epi.nome,
      numeroCA: epi.numeroCA,
      dataValidadeCA: epi.dataValidadeCA.toISOString(),
      quantidadeEstoque: epi.quantidadeEstoque,
    })),
    estoqueBaixo: data.estoqueBaixo.map((epi) => ({
      id: epi.id,
      nome: epi.nome,
      numeroCA: epi.numeroCA,
      quantidadeEstoque: epi.quantidadeEstoque,
      estoqueMinimo: epi.estoqueMinimo,
    })),
    proximasTrocas: data.proximasTrocas.map((entrega) => ({
      id: entrega.id,
      dataPrevistaTroca: entrega.dataPrevistaTroca.toISOString(),
      colaborador: entrega.colaborador,
      epi: entrega.epi,
    })),
    entregasRecentes: data.entregasRecentes.map((entrega) => ({
      id: entrega.id,
      dataEntrega: entrega.dataEntrega.toISOString(),
      dataPrevistaTroca: entrega.dataPrevistaTroca.toISOString(),
      statusDevolucao: entrega.statusDevolucao,
      colaborador: entrega.colaborador,
      epi: entrega.epi,
    })),
  };

  return <DashboardView data={view} />;
}
