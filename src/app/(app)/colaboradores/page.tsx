import Link from "next/link";
import { ChevronRight, LockKeyhole, Users } from "lucide-react";
import {
  ArquivarColaboradorButton,
  EditarColaboradorButton,
  NovoColaboradorButton,
} from "@/components/forms/colaborador-form";
import { StatusColaboradorSelect } from "@/components/forms/status-colaborador-select";
import { SearchForm } from "@/components/search-form";
import { ColaboradorStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireSession } from "@/lib/auth";
import { formatarCpf } from "@/lib/cpf";
import { iniciais } from "@/lib/format";
import { getColaboradores } from "@/server/queries/colaboradores";

export const metadata = { title: "Colaboradores" };

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, session] = await Promise.all([searchParams, requireSession()]);
  const colaboradores = await getColaboradores(q);
  const isAdmin = session.perfil === "ADMIN";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Colaboradores"
        description="Cadastro, status e PIN de validação das entregas digitais."
        actions={<NovoColaboradorButton podeDesligar={isAdmin} />}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchForm
            action="/colaboradores"
            defaultValue={q}
            placeholder="Buscar por nome, CPF, cargo ou setor..."
          />
          <Badge tone="slate">
            <Users className="h-3.5 w-3.5" />
            {colaboradores.length} colaborador(es)
          </Badge>
        </div>

        {colaboradores.length === 0 ? (
          <EmptyState
            title={q ? "Nenhum colaborador encontrado" : "Nenhum colaborador cadastrado"}
            description={
              q
                ? "Tente outro nome, CPF ou setor."
                : "Cadastre o primeiro colaborador para começar a registrar entregas."
            }
            icon={<Users className="h-6 w-6" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Colaborador</th>
                  <th className="px-5 py-3 font-semibold">CPF</th>
                  <th className="px-5 py-3 font-semibold">Cargo / setor</th>
                  <th className="px-5 py-3 font-semibold">PIN</th>
                  <th className="px-5 py-3 font-semibold">Em uso</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Ações</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {colaboradores.map((colaborador) => {
                  // Encaminha ao cliente apenas campos públicos (nunca o pinHash).
                  const dadosFormulario = {
                    id: colaborador.id,
                    nome: colaborador.nome,
                    cpf: colaborador.cpf,
                    cargo: colaborador.cargo,
                    setor: colaborador.setor,
                    status: colaborador.status,
                  };

                  return (
                    <tr key={colaborador.id} className="group hover:bg-surface-muted/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/colaboradores/${colaborador.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-bold text-muted">
                            {iniciais(colaborador.nome)}
                          </span>
                          <span className="font-semibold text-fg group-hover:text-brand-strong">
                            {colaborador.nome}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted">
                        {formatarCpf(colaborador.cpf)}
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <p>{colaborador.cargo}</p>
                        <p className="text-xs text-subtle">{colaborador.setor}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted"
                          title="PIN cadastrado (hash protegido)"
                        >
                          <LockKeyhole className="h-3.5 w-3.5" />
                          Protegido
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={colaborador._count.entregas > 0 ? "emerald" : "slate"}>
                          {colaborador._count.entregas}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <ColaboradorStatusBadge status={colaborador.status} />
                          <StatusColaboradorSelect
                            id={colaborador.id}
                            status={colaborador.status}
                            podeDesligar={isAdmin}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <EditarColaboradorButton
                            colaborador={dadosFormulario}
                            podeDesligar={isAdmin}
                          />
                          {isAdmin && colaborador.status !== "DESLIGADO" ? (
                            <ArquivarColaboradorButton colaborador={dadosFormulario} />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/colaboradores/${colaborador.id}`}
                          className="rounded-lg p-2 text-subtle group-hover:text-muted"
                          aria-label={`Abrir ${colaborador.nome}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
