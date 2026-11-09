import Link from "next/link";
import {
  AlertTriangle,
  CalendarRange,
  ChartColumn,
  FileSpreadsheet,
  FileText,
  Filter,
  PackageCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DevolucaoStatusBadge, StatusCaBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { STATUS_CA_LABELS } from "@/lib/constants";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly, formatDateTime, isoDate } from "@/lib/format";
import { relatorioFiltroSchema } from "@/lib/validations";
import {
  descreverPeriodo,
  getRelatorioConformidade,
} from "@/server/queries/relatorios";
import { cn } from "@/lib/utils";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

/**
 * Relatório de Conformidade Geral.
 * A filtragem é feita no servidor via querystring (GET), o que mantém a página
 * compartilhável e permite que os botões de exportação reutilizem exatamente
 * os mesmos parâmetros da consulta.
 */
export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const chavesFiltro = ["inicio", "fim", "setor", "caStatus"] as const;
  const temParametroDuplicado = chavesFiltro.some((chave) => Array.isArray(params[chave]));
  const primeiro = (valor: string | string[] | undefined) =>
    Array.isArray(valor) ? valor[0] : valor;

  const parsed = temParametroDuplicado
    ? null
    : relatorioFiltroSchema.safeParse({
        inicio: primeiro(params.inicio),
        fim: primeiro(params.fim),
        setor: primeiro(params.setor),
        caStatus: primeiro(params.caStatus),
      });

  // Filtros inválidos não derrubam a página: caem no padrão e avisam o usuário.
  const filtros = parsed && parsed.success ? parsed.data : relatorioFiltroSchema.parse({});
  const erroFiltro = temParametroDuplicado
    ? "Um mesmo filtro foi informado mais de uma vez. Aplique os filtros novamente."
    : parsed && !parsed.success
      ? parsed.error.issues[0]?.message
      : null;
  const relatorio = await getRelatorioConformidade(filtros);

  // Querystring reutilizada nos links de exportação.
  const query = new URLSearchParams();
  if (filtros.inicio) query.set("inicio", isoDate(filtros.inicio));
  if (filtros.fim) query.set("fim", isoDate(filtros.fim));
  if (filtros.setor) query.set("setor", filtros.setor);
  if (filtros.caStatus !== "TODOS") query.set("caStatus", filtros.caStatus);
  const parametros = query.toString();

  const hrefExport = (formato: "pdf" | "csv") =>
    `/api/relatorios/conformidade?formato=${formato}${parametros ? `&${parametros}` : ""}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatórios de conformidade"
        description="Audite entregas por período, setor e situação do CA e exporte evidências em PDF ou CSV."
        actions={
          <>
            <a
              href={hrefExport("pdf")}
              className={buttonVariants({ variant: "outline" })}
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </a>
            <a
              href={hrefExport("csv")}
              className={buttonVariants({ variant: "secondary" })}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </a>
          </>
        }
      />

      {erroFiltro ? <FormAlert tone="error">{erroFiltro}</FormAlert> : null}

      <Card>
        <CardHeader
          title="Filtros"
          description="Os filtros valem para a tabela e para os arquivos exportados."
        />
        <form
          method="get"
          action="/relatorios"
          className="grid gap-4 px-5 py-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]"
        >
          <Field label="Período — de" htmlFor="inicio">
            <Input
              id="inicio"
              name="inicio"
              type="date"
              defaultValue={filtros.inicio ? isoDate(filtros.inicio) : ""}
            />
          </Field>
          <Field label="Período — até" htmlFor="fim">
            <Input
              id="fim"
              name="fim"
              type="date"
              defaultValue={filtros.fim ? isoDate(filtros.fim) : ""}
            />
          </Field>
          <Field label="Setor" htmlFor="setor">
            <Select id="setor" name="setor" defaultValue={filtros.setor ?? ""}>
              <option value="">Todos os setores</option>
              {relatorio.setores.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status do CA (atual)" htmlFor="caStatus">
            <Select id="caStatus" name="caStatus" defaultValue={filtros.caStatus}>
              <option value="TODOS">Todos os status</option>
              {Object.entries(STATUS_CA_LABELS).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <button type="submit" className={buttonVariants({ className: "flex-1" })}>
              <Filter className="h-4 w-4" />
              Aplicar
            </button>
            <Link
              href="/relatorios"
              className={buttonVariants({ variant: "ghost", size: "md" })}
            >
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          icon={<ChartColumn className="h-4 w-4" />}
          label="Entregas no período"
          value={relatorio.resumo.totalEntregas}
          hint={descreverPeriodo(filtros)}
        />
        <ResumoCard
          icon={<PackageCheck className="h-4 w-4" />}
          label="Itens entregues"
          value={relatorio.resumo.totalItens}
          hint={`${relatorio.resumo.emUso} em uso · ${relatorio.resumo.finalizadas} finalizadas`}
        />
        <ResumoCard
          icon={<Users className="h-4 w-4" />}
          label="Colaboradores atendidos"
          value={relatorio.resumo.colaboradores}
          hint={`${relatorio.resumo.caValido} entrega(s) com CA válido`}
        />
        <ResumoCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="CA vencido / a vencer"
          value={relatorio.resumo.caVencido + relatorio.resumo.caAVencer}
          hint={`${relatorio.resumo.caVencido} vencido(s) · ${relatorio.resumo.caAVencer} a vencer`}
          tone={relatorio.resumo.caVencido > 0 ? "danger" : "warning"}
        />
      </div>

      <Card>
        <CardHeader
          title={`Detalhamento (${relatorio.linhas.length})`}
          description="CA e validade na entrega vêm do snapshot histórico; o status é calculado pela validade atual do cadastro do EPI."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
              <CalendarRange className="h-3.5 w-3.5" />
              Gerado em {formatDateTime(relatorio.geradoEm)}
            </span>
          }
        />

        {relatorio.linhas.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-subtle" />
            <p className="mt-3 font-semibold text-fg">Nenhuma entrega no recorte</p>
            <p className="mt-1 text-sm text-muted">
              Ajuste o período, o setor ou o status do CA para ampliar a consulta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                  <th className="px-5 py-3 font-semibold">Colaborador</th>
                  <th className="px-5 py-3 font-semibold">Setor</th>
                  <th className="px-5 py-3 font-semibold">EPI</th>
                  <th className="px-5 py-3 font-semibold">CA na entrega</th>
                  <th className="px-5 py-3 font-semibold">Status atual do CA</th>
                  <th className="px-5 py-3 font-semibold">Qtd.</th>
                  <th className="px-5 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {relatorio.linhas.map((linha) => (
                  <tr key={linha.id} className="hover:bg-surface-muted/60">
                    <td className="px-5 py-3 text-muted">
                      <p>{formatDateOnly(linha.dataEntrega)}</p>
                      <p className="text-[11px] text-subtle">por {linha.usuarioNome}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/colaboradores/${linha.colaboradorId}`}
                        className="font-semibold text-fg hover:text-brand-strong"
                      >
                        {linha.colaboradorNome}
                      </Link>
                      <p className="text-[11px] text-subtle">
                        {formatarCpf(linha.colaboradorCpf)} · {linha.cargo}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-fg-soft">{linha.setor}</td>
                    <td className="max-w-[220px] px-5 py-3 text-fg-soft">{linha.epiNome}</td>
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-fg-soft">CA {linha.numeroCA}</p>
                      <p className="text-[11px] text-subtle">
                        válido até {formatDateOnly(linha.validadeCAEntrega)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <StatusCaBadge status={linha.statusCa} />
                        <p className="text-[11px] text-subtle">
                          cadastro atual: {formatDateOnly(linha.validadeCAAtual)}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-fg-soft">{linha.quantidade}</td>
                    <td className="px-5 py-3">
                      <DevolucaoStatusBadge status={linha.statusDevolucao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-subtle">
        O status do CA é classificado como válido, a vencer (até 30 dias) ou vencido
        conforme a validade atual do EPI. As colunas &quot;CA na entrega&quot; preservam o
        histórico do ato.
      </p>
    </div>
  );
}

function ResumoCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            tone === "danger"
              ? "bg-danger-soft text-danger-strong"
              : tone === "warning"
                ? "bg-warning-soft text-warning-strong"
                : "bg-brand-soft text-brand-strong",
          )}
        >
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] text-subtle">{hint}</p>
    </Card>
  );
}
