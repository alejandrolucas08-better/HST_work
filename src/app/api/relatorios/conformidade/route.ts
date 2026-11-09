import { nomeArquivo, respostaCsv, respostaPdf } from "@/server/download";
import {
  exigirSessaoApi,
  parametroUnico,
  respostaErro,
  validarParametrosUnicos,
} from "@/server/http";
import { gerarCsvConformidade } from "@/server/csv/relatorio";
import { gerarRelatorioConformidadePdf } from "@/server/pdf/relatorio";
import {
  filtrosDeParams,
  getRelatorioConformidade,
} from "@/server/queries/relatorios";
import { DomainError } from "@/server/services/erros";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/relatorios/conformidade?formato=pdf|csv&inicio=YYYY-MM-DD&fim=...
 * Exporta o relatório de conformidade aplicando os mesmos filtros da tela:
 * período (data da entrega), setor e status atual do CA.
 */
export async function GET(request: Request) {
  try {
    await exigirSessaoApi();

    const { searchParams } = new URL(request.url);
    validarParametrosUnicos(searchParams, [
      "formato",
      "inicio",
      "fim",
      "setor",
      "caStatus",
    ]);

    const formato = parametroUnico(searchParams, "formato") ?? "pdf";
    if (formato !== "pdf" && formato !== "csv") {
      throw new DomainError("FORMATO_INVALIDO", "Formato deve ser 'pdf' ou 'csv'.", {
        status: 400,
      });
    }

    const filtros = filtrosDeParams(searchParams);
    const relatorio = await getRelatorioConformidade(filtros);

    if (formato === "csv") {
      return respostaCsv(
        gerarCsvConformidade(relatorio),
        nomeArquivo("relatorio-conformidade", "csv"),
      );
    }

    const pdf = await gerarRelatorioConformidadePdf(relatorio);
    return respostaPdf(pdf, nomeArquivo("relatorio-conformidade", "pdf"));
  } catch (error) {
    return respostaErro(error);
  }
}
