import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Plus, ShieldCheck } from "lucide-react";
import { DeliveryReceiptButton } from "@/components/audit/delivery-receipt";
import { DevolucaoButton } from "@/components/forms/devolucao-button";
import { DevolucaoStatusBadge, TrocaBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { statusDevolucaoSchema } from "@/lib/validations";
import { getEntregas } from "@/server/queries/entregas";
import { cn } from "@/lib/utils";

export const metadata = { title: "Entregas" };

const filtros = [
  { value: undefined, label: "Todas" },
  { value: "EM_USO", label: "Em uso" },
  { value: "DEVOLVIDO", label: "Devolvidas" },
  { value: "TROCADO", label: "Trocadas" },
  { value: "PERDIDO", label: "Perdidas" },
] as const;

const mensagens: Record<string, { tone: "success" | "error"; texto: string }> = {
  entrega: { tone: "success", texto: "Entrega digital registrada com sucesso." },
  devolucao: { tone: "success", texto: "Devolução registrada com sucesso." },
  // Códigos de erro de domínio emitidos pelas Server Actions de devolução.
  ENTREGA_NAO_ENCONTRADA: { tone: "error", texto: "Entrega não encontrada." },
  ENTREGA_JA_FINALIZADA: { tone: "error", texto: "Esta entrega já foi finalizada." },
};

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    sucesso?: string | string[];
    erro?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const primeiro = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] : valor;
  const statusParsed = statusDevolucaoSchema.safeParse(primeiro(params.status));
  const status = statusParsed.success ? statusParsed.data : undefined;
  const entregas = await getEntregas(status);
  const mensagem =
    mensagens[primeiro(params.sucesso) ?? primeiro(params.erro) ?? ""];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Entregas digitais"
        description="Histórico de entregas, validação por PIN ou assinatura e controle de devoluções."
        actions={
          <Link href="/entregas/nova" className={buttonVariants({ size: "lg" })}>
            <Plus className="h-4 w-4" />
            Nova entrega
          </Link>
        }
      />

      {mensagem ? (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
            mensagem.tone === "success"
              ? "border-brand-border bg-brand-soft text-brand-strong"
              : "border-danger-border bg-danger-soft text-danger-strong",
          )}
        >
          {mensagem.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {mensagem.texto}
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 shadow-sm">
        {filtros.map((filtro) => {
          const ativo = (status ?? undefined) === filtro.value;
          const href = filtro.value ? `/entregas?status=${filtro.value}` : "/entregas";
          return (
            <Link
              key={filtro.label}
              href={href}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                ativo
                  ? "bg-brand text-brand-contrast shadow-sm"
                  : "text-muted hover:bg-surface-sunken hover:text-fg",
              )}
            >
              {filtro.label}
            </Link>
          );
        })}
      </div>

      <Card>
        {entregas.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="Nenhuma entrega encontrada"
            description={
              status
                ? "Não há entregas com este status."
                : "Registre a primeira entrega digital validada por PIN ou assinatura."
            }
            action={
              <Link href="/entregas/nova" className={buttonVariants({ size: "sm" })}>
                Nova entrega
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Colaborador</th>
                  <th className="px-5 py-3 font-semibold">EPI</th>
                  <th className="px-5 py-3 font-semibold">Qtd.</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                  <th className="px-5 py-3 font-semibold">Troca prevista</th>
                  <th className="px-5 py-3 font-semibold">Validação</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entregas.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-surface-muted/60">
                    <td className="px-5 py-3">
                      <Link
                        href={`/colaboradores/${entrega.colaborador.id}`}
                        className="font-semibold text-fg hover:text-brand-strong"
                      >
                        {entrega.colaborador.nome}
                      </Link>
                      <p className="text-xs text-subtle">{entrega.colaborador.setor}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-fg-soft">{entrega.epiNomeEntrega}</p>
                      <p className="font-mono text-[11px] text-subtle">
                        CA {entrega.numeroCAEntrega}
                      </p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-fg-soft">
                      {entrega.quantidade}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      <p>{formatDateOnly(entrega.dataEntrega)}</p>
                      <p className="text-[11px] text-subtle">
                        por {entrega.usuario.nome}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-muted">{formatDateOnly(entrega.dataPrevistaTroca)}</p>
                      {entrega.statusDevolucao === "EM_USO" ? (
                        <div className="mt-1">
                          <TrocaBadge dataPrevistaTroca={entrega.dataPrevistaTroca} />
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <span
                          className={
                            entrega.pinValidado || entrega.temAssinatura
                              ? "inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
                              : "inline-flex items-center gap-1 text-xs font-semibold text-danger-strong"
                          }
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {entrega.pinValidado
                            ? entrega.temAssinatura
                              ? "PIN + assinatura"
                              : "PIN validado"
                            : entrega.temAssinatura
                              ? "Assinatura capturada"
                              : "Sem validação"}
                        </span>
                        <p className="text-[11px] text-subtle">
                          {entrega.pinValidado && entrega.temAssinatura
                            ? "Dupla validação"
                            : entrega.pinValidado
                              ? "Sem assinatura"
                              : entrega.temAssinatura
                                ? "Assinatura em tela"
                                : "Registro legado"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <DevolucaoStatusBadge status={entrega.statusDevolucao} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <DeliveryReceiptButton entregaId={entrega.id} compact />
                        {entrega.statusDevolucao === "EM_USO" ? (
                          <DevolucaoButton
                            entregaId={entrega.id}
                            colaboradorNome={entrega.colaborador.nome}
                            epiNome={entrega.epiNomeEntrega}
                            quantidade={entrega.quantidade}
                          />
                        ) : (
                          <span className="text-xs text-subtle">Finalizada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-subtle">
        Registros mais recentes primeiro · limite de 200 linhas por consulta.
      </p>
    </div>
  );
}
