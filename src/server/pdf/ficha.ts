import type { StatusColaborador, StatusDevolucao } from "@prisma/client";
import { STATUS_COLABORADOR_LABELS, STATUS_DEVOLUCAO_LABELS } from "@/lib/constants";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { PdfBuilder } from "./builder";
import { EMPRESA, TERMOS_RESPONSABILIDADE_EPI, enderecoEmpresa } from "./empresa";

/**
 * =============================================================================
 * Renderizador da Ficha Individual de EPI (PDF)
 * =============================================================================
 * Estrutura do documento:
 *   1. Cabeçalho institucional (repetido em todas as páginas pelo builder);
 *   2. Identificação do colaborador;
 *   3. Dados da empresa contratante;
 *   4. Histórico completo de entregas (com CA/validade congelados na entrega);
 *   5. Termos legais de responsabilidade pelo uso do EPI;
 *   6. Assinaturas (colaborador e responsável pela entrega);
 *   7. Anexo com os comprovantes visuais das assinaturas digitais.
 *
 * O foco é auditoria trabalhista: cada linha usa os SNAPSHOTS da entrega, não
 * o cadastro atual do EPI. Assim, renomear um EPI ou renovar um CA depois não
 * altera o documento já emitido.
 * =============================================================================
 */

export type EntregaFicha = {
  id: string;
  quantidade: number;
  dataEntrega: Date;
  dataPrevistaTroca: Date;
  assinaturaDigital: string | null;
  pinValidado: boolean;
  statusDevolucao: StatusDevolucao;
  observacoes: string | null;
  epiNomeEntrega: string;
  numeroCAEntrega: string;
  validadeCAEntrega: Date;
};

export type ColaboradorFicha = {
  nome: string;
  cpf: string;
  cargo: string;
  setor: string;
  status: StatusColaborador;
  createdAt: Date;
  entregas: EntregaFicha[];
};

/** Texto da coluna "Validação" do histórico. */
function validacaoDigital(entrega: EntregaFicha): string {
  if (entrega.pinValidado && entrega.assinaturaDigital) return "PIN + assinatura";
  if (entrega.pinValidado) return "PIN validado";
  if (entrega.assinaturaDigital) return "Assinatura capturada";
  return "Sem validação digital";
}

export async function gerarFichaEpiPdf(
  colaborador: ColaboradorFicha,
): Promise<Uint8Array> {
  const builder = await PdfBuilder.criar({
    titulo: "Ficha Individual de EPI",
    subtitulo: "Histórico de entregas para auditoria de SST",
  });

  // ---------------------------------------------------------------------------
  // 1. Identificação do colaborador
  // ---------------------------------------------------------------------------
  builder.secao("Identificação do colaborador");
  builder.caixaDados(
    [
      ["Nome completo", colaborador.nome],
      ["CPF", formatarCpf(colaborador.cpf)],
      ["Cargo", colaborador.cargo],
      ["Setor", colaborador.setor],
      ["Situação", STATUS_COLABORADOR_LABELS[colaborador.status]],
      ["Cadastro", formatDateOnly(colaborador.createdAt)],
    ],
    2,
  );

  // ---------------------------------------------------------------------------
  // 2. Dados da empresa (exigidos em documentos de auditoria)
  // ---------------------------------------------------------------------------
  builder.secao("Dados da empresa");
  builder.caixaDados(
    [
      ["Razão social", EMPRESA.nome],
      ["CNPJ", EMPRESA.cnpj],
      ["Endereço", enderecoEmpresa()],
      ["Telefone / e-mail", `${EMPRESA.telefone} | ${EMPRESA.email}`],
      ["Responsável SST", EMPRESA.responsavel],
      ["Cargo do responsável", EMPRESA.cargoResponsavel],
    ],
    2,
  );

  // ---------------------------------------------------------------------------
  // 3. Histórico completo de entregas
  // ---------------------------------------------------------------------------
  const totalItens = colaborador.entregas.reduce(
    (soma, entrega) => soma + entrega.quantidade,
    0,
  );
  const assinaturas = colaborador.entregas.filter((entrega) =>
    Boolean(entrega.assinaturaDigital),
  );

  builder.secao(
    `Histórico de entregas de EPI (${colaborador.entregas.length} registro(s) · ${totalItens} item(ns))`,
  );

  builder.tabela({
    colunas: [
      { titulo: "Data", peso: 9 },
      { titulo: "EPI", peso: 22 },
      { titulo: "CA na entrega", peso: 9 },
      { titulo: "Validade do CA", peso: 9 },
      { titulo: "Qtd.", peso: 5, alinhamento: "right" },
      { titulo: "Troca prevista", peso: 9 },
      { titulo: "Situação", peso: 8 },
      { titulo: "Validação", peso: 11 },
    ],
    linhas: colaborador.entregas.map((entrega) => [
      formatDateOnly(entrega.dataEntrega),
      entrega.epiNomeEntrega,
      entrega.numeroCAEntrega,
      formatDateOnly(entrega.validadeCAEntrega),
      String(entrega.quantidade),
      formatDateOnly(entrega.dataPrevistaTroca),
      STATUS_DEVOLUCAO_LABELS[entrega.statusDevolucao],
      validacaoDigital(entrega),
    ]),
    vazio: "Nenhuma entrega de EPI registrada para este colaborador.",
  });

  builder.espaco(6);
  builder.texto(
    "Nota: o número do CA e a validade do CA acima correspondem aos dados registrados no momento de cada entrega (snapshot histórico), preservando a fidelidade do documento.",
    { size: 7, color: undefined },
  );

  // ---------------------------------------------------------------------------
  // 4. Termos legais de responsabilidade
  // ---------------------------------------------------------------------------
  builder.secao("Termos de responsabilidade e recebimento de EPI");
  TERMOS_RESPONSABILIDADE_EPI.forEach((termo, indice) => {
    builder.texto(`${indice + 1}. ${termo}`, { size: 7.6, lineHeight: 10.6 });
    builder.espaco(2.5);
  });

  // ---------------------------------------------------------------------------
  // 5. Assinatura do colaborador
  // ---------------------------------------------------------------------------
  builder.secao("Assinatura do colaborador");
  const ultimaAssinatura = assinaturas[0];

  if (ultimaAssinatura) {
    await builder.assinatura(ultimaAssinatura.assinaturaDigital, {
      legenda: `Assinatura digital registrada em ${formatDateTime(ultimaAssinatura.dataEntrega)} - ${ultimaAssinatura.epiNomeEntrega} (CA ${ultimaAssinatura.numeroCAEntrega})`,
      altura: 58,
    });
  } else {
    builder.linhaAssinatura(
      `${colaborador.nome} - CPF ${formatarCpf(colaborador.cpf)} (assinatura no ato do recebimento)`,
    );
  }

  builder.linhaAssinatura(
    `${EMPRESA.responsavel} - ${EMPRESA.cargoResponsavel} | ${EMPRESA.nome} - CNPJ ${EMPRESA.cnpj}`,
  );

  builder.espaco(4);
  builder.texto(
    `Local e data: ${EMPRESA.cidade}/${EMPRESA.uf}, ${formatDateOnly(new Date())}.`,
    { size: 8 },
  );

  // ---------------------------------------------------------------------------
  // 6. Anexo: comprovantes visuais das assinaturas digitais
  // ---------------------------------------------------------------------------
  if (assinaturas.length > 0) {
    builder.novaPagina();
    builder.secao(`Anexo - comprovantes de assinatura digital (${assinaturas.length})`);

    for (const entrega of assinaturas) {
      await builder.assinatura(entrega.assinaturaDigital, {
        legenda: `${formatDateTime(entrega.dataEntrega)} | ${entrega.epiNomeEntrega} | CA ${entrega.numeroCAEntrega} | Qtd. ${entrega.quantidade}`,
        altura: 48,
      });
    }
  }

  return builder.finalizar();
}
