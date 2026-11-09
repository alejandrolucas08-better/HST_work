import {
  STATUS_CA_LABELS,
  STATUS_DEVOLUCAO_LABELS,
} from "@/lib/constants";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import type { RelatorioConformidade } from "@/server/queries/relatorios";

/**
 * =============================================================================
 * Exportação CSV do Relatório de Conformidade
 * =============================================================================
 * Formato escolhido para abrir diretamente no Excel pt-BR:
 * - delimitador ponto e vírgula (padrão regional);
 * - BOM UTF-8 no início para preservar acentos;
 * - todos os campos entre aspas, com aspas internas duplicadas (RFC 4180).
 * =============================================================================
 */
export function gerarCsvConformidade(relatorio: RelatorioConformidade): string {
  const cabecalho = [
    "Data da entrega",
    "Colaborador",
    "CPF",
    "Setor",
    "Cargo",
    "EPI entregue",
    "CA na entrega",
    "Validade do CA na entrega",
    "Validade atual do CA",
    "Status do CA",
    "Quantidade",
    "Troca prevista",
    "Situação",
    "Validação digital",
    "Responsável pelo registro",
    "Observações",
  ];

  const linhas = relatorio.linhas.map((linha) => [
    formatDateTime(linha.dataEntrega),
    linha.colaboradorNome,
    formatarCpf(linha.colaboradorCpf),
    linha.setor,
    linha.cargo,
    linha.epiNome,
    linha.numeroCA,
    formatDateOnly(linha.validadeCAEntrega),
    formatDateOnly(linha.validadeCAAtual),
    STATUS_CA_LABELS[linha.statusCa],
    String(linha.quantidade),
    formatDateOnly(linha.dataPrevistaTroca),
    STATUS_DEVOLUCAO_LABELS[linha.statusDevolucao],
    validacao(linha.pinValidado, linha.temAssinatura),
    linha.usuarioNome,
    linha.observacoes ?? "",
  ]);

  const escapar = (valor: string) => `"${valor.replace(/"/g, '""')}"`;
  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escapar).join(";"))
    .join("\r\n");

  return `\uFEFF${conteudo}\r\n`;
}

function validacao(pinValidado: boolean, temAssinatura: boolean): string {
  if (pinValidado && temAssinatura) return "PIN + assinatura";
  if (pinValidado) return "PIN validado";
  if (temAssinatura) return "Assinatura capturada";
  return "Sem validação digital";
}
