import { HardHat, Info } from "lucide-react";
import { AlternarSituacaoEpiButton, EditarEpiButton, NovoEpiButton } from "@/components/forms/epi-form";
import { ReporEstoqueButton } from "@/components/forms/repor-estoque-form";
import { SearchForm } from "@/components/search-form";
import { CaValidadeBadge, EstoqueBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth";
import { formatDateOnly, formatQuantity } from "@/lib/format";
import { getEpis } from "@/server/queries/epis";

export const metadata = { title: "EPIs" };

export default async function EpisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, session] = await Promise.all([searchParams, requireSession()]);
  const epis = await getEpis(q);
  const isAdmin = session.perfil === "ADMIN";

  return (
    <div className="space-y-5">
      <PageHeader
        title="EPIs e estoque"
        description="Certificados de Aprovação, saldo disponível e intervalo de troca."
        actions={<NovoEpiButton />}
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-info-border bg-info-soft px-4 py-3 text-xs leading-relaxed text-info-strong">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Entregas são bloqueadas automaticamente quando o CA está vencido. A data de troca de
          cada entrega é calculada com base no intervalo cadastrado aqui.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchForm
            action="/epis"
            defaultValue={q}
            placeholder="Buscar por nome ou número do CA..."
          />
          <Badge tone="slate">
            <HardHat className="h-3.5 w-3.5" />
            {epis.length} EPI(s)
          </Badge>
        </div>

        {epis.length === 0 ? (
          <EmptyState
            title={q ? "Nenhum EPI encontrado" : "Nenhum EPI cadastrado"}
            description={
              q
                ? "Tente outro nome ou número de CA."
                : "Cadastre o primeiro EPI para controlar CA, estoque e trocas."
            }
            icon={<HardHat className="h-6 w-6" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">EPI</th>
                  <th className="px-5 py-3 font-semibold">CA / validade</th>
                  <th className="px-5 py-3 font-semibold">Estoque</th>
                  <th className="px-5 py-3 font-semibold">Mínimo</th>
                  <th className="px-5 py-3 font-semibold">Troca</th>
                  <th className="px-5 py-3 font-semibold">Em uso</th>
                  <th className="px-5 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {epis.map((epi) => {
                  const dadosFormulario = {
                    id: epi.id,
                    nome: epi.nome,
                    numeroCA: epi.numeroCA,
                    dataValidadeCA: epi.dataValidadeCA,
                    quantidadeEstoque: epi.quantidadeEstoque,
                    estoqueMinimo: epi.estoqueMinimo,
                    intervaloTrocaDias: epi.intervaloTrocaDias,
                    ativo: epi.ativo,
                  };

                  return (
                    <tr key={epi.id} className="hover:bg-surface-muted/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-fg">{epi.nome}</p>
                          {!epi.ativo ? <Badge tone="slate">Inativo</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs text-muted">CA {epi.numeroCA}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted">
                            até {formatDateOnly(epi.dataValidadeCA)}
                          </span>
                          <CaValidadeBadge dataValidadeCA={epi.dataValidadeCA} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-base font-bold text-fg">
                            {formatQuantity(epi.quantidadeEstoque)}
                          </span>
                          <EstoqueBadge
                            quantidade={epi.quantidadeEstoque}
                            minimo={epi.estoqueMinimo}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {formatQuantity(epi.estoqueMinimo)}
                      </td>
                      <td className="px-5 py-3 text-muted">{epi.intervaloTrocaDias} dias</td>
                      <td className="px-5 py-3">
                        <Badge tone={epi._count.entregas > 0 ? "emerald" : "slate"}>
                          {epi._count.entregas}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <ReporEstoqueButton
                            epiId={epi.id}
                            epiNome={epi.nome}
                            estoqueAtual={epi.quantidadeEstoque}
                          />
                          <EditarEpiButton
                            epi={dadosFormulario}
                            podeAlterarSituacao={isAdmin}
                          />
                          {isAdmin ? (
                            <AlternarSituacaoEpiButton
                              epi={{ id: epi.id, nome: epi.nome, ativo: epi.ativo }}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
