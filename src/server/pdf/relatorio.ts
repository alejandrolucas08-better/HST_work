import {
  STATUS_CA_LABELS,
  STATUS_DEVOLUCAO_LABELS,
} from "@/lib/constants";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly } from "@/lib/format";
import { descreverPeriodo, type RelatorioConformidade } from "@/server/queries/relatorios";
import { PdfBuilder } from "./builder";
import { EMPRESA, TERMOS_RESPONSABILIDADE_EPI, enderecoEmpresa } from "./empresa";

/**
 * =============================================================================
 * Renderizador do Relatório de Conformidade (PDF)
 * =============================================================================
 * Documento paisagem (A4 horizontal) com:
 *   - cabeçalho institucional em todas as páginas (builder);
 *   - dados da empresa;
 *   - resumo executivo (KPIs de conformidade);
 *   - período/setor/status aplicados;
 *   - tabela paginada com repetição de cabeçalho;
 *   - nota metodológica e termos legais.
 *
 * O cabeçalho de tabela é redesenhado automaticamente a cada quebra de página
 * pelo `PdfBuilder.tabela`, o que mantém o relatório legível quando impresso.
 * =============================================================================
 */
export async function gerarRelatorioConformidadePdf(
  relatorio: RelatorioConformidade,
): Promise<Uint8Array> {
  const { filtros, linhas, resumo } = relatorio;
  const builder = await PdfBuilder.criar({
    titulo: "Relatório de Conformidade de EPIs",
    subtitulo: `Período: ${descreverPeriodo(filtros)}`,
    paisagem: true,
  });

  // ---------------------------------------------------------------------------
  // 1. Dados da empresa
  // ---------------------------------------------------------------------------
  builder.secao("Empresa");
  builder.caixaDados(
    [
      ["Razão social", EMPRESA.nome],
      ["CNPJ", EMPRESA.cnpj],
      ["Endereço", enderecoEmpresa()],
      ["Telefone / e-mail", `${EMPRESA.telefone} | ${EMPRESA.email}`],
    ],
    2,
  );

  // ---------------------------------------------------------------------------
  // 2. Resumo executivo
  // ---------------------------------------------------------------------------
  builder.secao("Resumo de conformidade");
  builder.caixaDados(
    [
      ["Entregas no período", String(resumo.totalEntregas)],
      ["Itens entregues", String(resumo.totalItens)],
      ["Colaboradores atendidos", String(resumo.colaboradores)],
      ["Entregas em uso", String(resumo.emUso)],
      ["CA válido", String(resumo.caValido)],
      ["CA a vencer (30 dias)", String(resumo.caAVencer)],
      ["CA vencido", String(resumo.caVencido)],
      ["Entregas finalizadas", String(resumo.finalizadas)],
    ],
    4,
  );

  // ---------------------------------------------------------------------------
  // 3. Filtros aplicados
  // ---------------------------------------------------------------------------
  builder.secao("Filtros aplicados");
  builder.caixaDados(
    [
      ["Período", descreverPeriodo(filtros)],
      ["Setor", filtros.setor ?? "Todos os setores"],
      [
        "Status do CA",
        filtros.caStatus === "TODOS"
          ? "Todos os status"
          : STATUS_CA_LABELS[filtros.caStatus],
      ],
      ["Gerado em", formatDateOnly(relatorio.geradoEm)],
    ],
    4,
  );

  // ---------------------------------------------------------------------------
  // 4. Tabela analítica
  // ---------------------------------------------------------------------------
  builder.secao(`Detalhamento das entregas (${linhas.length})`);

  builder.tabela({
    colunas: [
      { titulo: "Entrega", peso: 8 },
      { titulo: "Colaborador", peso: 19 },
      { titulo: "Setor", peso: 10 },
      { titulo: "EPI", peso: 18 },
      { titulo: "CA", peso: 7 },
      { titulo: "Validade CA", peso: 9 },
      { titulo: "Status CA", peso: 8 },
      { titulo: "Qtd.", peso: 5, alinhamento: "right" },
      { titulo: "Situação", peso: 8 },
    ],
    linhas: linhas.map((linha) => [
      formatDateOnly(linha.dataEntrega),
      `${linha.colaboradorNome}\nCPF ${formatarCpf(linha.colaboradorCpf)}`,
      linha.setor,
      linha.epiNome,
      linha.numeroCA,
      formatDateOnly(linha.validadeCAAtual),
      STATUS_CA_LABELS[linha.statusCa],
      String(linha.quantidade),
      STATUS_DEVOLUCAO_LABELS[linha.statusDevolucao],
    ]),
    vazio: "Nenhuma entrega encontrada para os filtros selecionados.",
  });

  builder.espaco(7);
  builder.texto(
    "Nota metodológica: o status do CA é calculado a partir da validade atual do cadastro do EPI (vencido, a vencer em até 30 dias ou válido). O número do CA e a validade do CA na entrega são preservados por snapshot histórico e podem divergir do cadastro atual.",
    { size: 6.8 },
  );

  // ---------------------------------------------------------------------------
  // 5. Termos legais
  // ---------------------------------------------------------------------------
  builder.secao("Termos de responsabilidade pelo uso do EPI");
  TERMOS_RESPONSABILIDADE_EPI.forEach((termo, indice) => {
    builder.texto(`${indice + 1}. ${termo}`, { size: 7.2, lineHeight: 10 });
    builder.espaco(2);
  });

  builder.espaco(6);
  builder.linhaAssinatura(
    `${EMPRESA.responsavel} - ${EMPRESA.cargoResponsavel} | ${EMPRESA.nome}`,
  );

  return builder.finalizar();
}
