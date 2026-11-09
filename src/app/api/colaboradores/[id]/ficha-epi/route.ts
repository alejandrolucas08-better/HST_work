import { nomeArquivo, respostaPdf } from "@/server/download";
import { exigirSessaoApi, respostaErro, validarIdRota } from "@/server/http";
import { gerarFichaEpiPdf } from "@/server/pdf/ficha";
import { getColaboradorFicha } from "@/server/queries/colaboradores";
import { DomainError } from "@/server/services/erros";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/colaboradores/[id]/ficha-epi
 * Emite a Ficha Individual de EPI em PDF (histórico completo + assinaturas).
 * Qualquer usuário autenticado pode emitir; a rota não expõe hashes de PIN.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigirSessaoApi();
    const id = validarIdRota((await params).id);
    const colaborador = await getColaboradorFicha(id);

    if (!colaborador) {
      throw new DomainError("COLABORADOR_NAO_ENCONTRADO", "Colaborador não encontrado.", {
        status: 404,
      });
    }

    const pdf = await gerarFichaEpiPdf(colaborador);
    return respostaPdf(pdf, nomeArquivo(`ficha-epi-${colaborador.nome}`, "pdf"));
  } catch (error) {
    return respostaErro(error);
  }
}
