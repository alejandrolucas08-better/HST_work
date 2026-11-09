import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  LockKeyhole,
  Plus,
  ShieldCheck,
} from "lucide-react";
import {
  ArquivarColaboradorButton,
  EditarColaboradorButton,
} from "@/components/forms/colaborador-form";
import { DevolucaoStatusBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { getColaborador } from "@/server/queries/colaboradores";

export default async function ColaboradorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const colaborador = await getColaborador(id);
  if (!colaborador) notFound();

  const isAdmin = session.perfil === "ADMIN";
  const dadosFormulario = {
    id: colaborador.id,
    nome: colaborador.nome,
    cpf: colaborador.cpf,
    cargo: colaborador.cargo,
    setor: colaborador.setor,
    status: colaborador.status,
  };

  return (
    <div className="space-y-5">
      <Link
        href="/colaboradores"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para colaboradores
      </Link>

      <PageHeader
        title={colaborador.nome}
        description={`${colaborador.cargo} · ${colaborador.setor}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditarColaboradorButton colaborador={dadosFormulario} podeDesligar={isAdmin} />
            {isAdmin && colaborador.status !== "DESLIGADO" ? (
              <ArquivarColaboradorButton colaborador={dadosFormulario} />
            ) : null}
            {colaborador.status === "ATIVO" ? (
              <Link
                href={`/entregas/nova?colaborador=${colaborador.id}`}
                className={buttonVariants()}
              >
                <Plus className="h-4 w-4" />
                Nova entrega
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="CPF"
          value={formatarCpf(colaborador.cpf)}
          icon={<LockKeyhole className="h-4 w-4" />}
        />
        <InfoCard
          label="Cargo"
          value={colaborador.cargo}
          icon={<BriefcaseBusiness className="h-4 w-4" />}
        />
        <InfoCard
          label="Setor"
          value={colaborador.setor}
          icon={<Building2 className="h-4 w-4" />}
        />
        <InfoCard
          label="PIN de entrega"
          value="Cadastrado"
          hint="Hash bcrypt — não é possível visualizar"
          icon={<LockKeyhole className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader
          title={`Histórico de entregas (${colaborador.entregas.length})`}
          description="Todos os EPIs entregues a este colaborador."
        />
        {colaborador.entregas.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="Nenhuma entrega registrada"
            description="As entregas digitais aparecerão aqui com data, PIN e assinatura."
            action={
              colaborador.status === "ATIVO" ? (
                <Link
                  href={`/entregas/nova?colaborador=${colaborador.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Registrar entrega
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">EPI</th>
                  <th className="px-5 py-3 font-semibold">Qtd.</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                  <th className="px-5 py-3 font-semibold">Troca prevista</th>
                  <th className="px-5 py-3 font-semibold">Validação</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {colaborador.entregas.map((entrega) => (
                  <tr key={entrega.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{entrega.epi.nome}</p>
                      <p className="text-xs text-subtle">CA {entrega.epi.numeroCA}</p>
                    </td>
                    <td className="px-5 py-3 text-muted">{entrega.quantidade}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateTime(entrega.dataEntrega)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateOnly(entrega.dataPrevistaTroca)}
                    </td>
                    <td className="px-5 py-3">
                      <ValidacaoDigital
                        pinValidado={entrega.pinValidado}
                        assinatura={Boolean(entrega.assinaturaDigital)}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <DevolucaoStatusBadge status={entrega.statusDevolucao} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ValidacaoDigital({
  pinValidado,
  assinatura,
}: {
  pinValidado: boolean;
  assinatura: boolean;
}) {
  const rotulo = pinValidado
    ? assinatura
      ? "PIN + assinatura"
      : "PIN validado"
    : assinatura
      ? "Assinatura capturada"
      : "Sem validação digital";

  return (
    <span
      className={
        pinValidado || assinatura
          ? "inline-flex items-center gap-1 text-xs font-semibold text-brand-strong"
          : "inline-flex items-center gap-1 text-xs font-semibold text-danger-strong"
      }
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {rotulo}
    </span>
  );
}

function InfoCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-fg">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-subtle">{hint}</p> : null}
    </Card>
  );
}
