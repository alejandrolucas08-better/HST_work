"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock,
  Download,
  FileCheck2,
  HardHat,
  KeyRound,
  Loader2,
  PenLine,
  ShieldCheck,
  User,
} from "lucide-react";
import { DevolucaoStatusBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { STATUS_DEVOLUCAO_LABELS } from "@/lib/constants";
import { formatarCpf } from "@/lib/cpf";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { normalizarAssinatura } from "@/lib/signature";
import { cn } from "@/lib/utils";

/**
 * Comprovante de Entrega (modal de inspeção).
 *
 * A assinatura em Base64 pode ser grande. Por isso o modal NÃO recebe os dados
 * pela página: ele busca `/api/entregas/[id]` somente quando é aberto (lazy),
 * evitando carregar todas as imagens no payload da listagem. O resultado fica
 * em cache local enquanto o componente estiver montado.
 */

type StatusDevolucao = "EM_USO" | "DEVOLVIDO" | "TROCADO" | "PERDIDO";

export type EntregaComprovante = {
  id: string;
  quantidade: number;
  dataEntrega: string;
  dataPrevistaTroca: string;
  assinaturaDigital: string | null;
  pinValidado: boolean;
  statusDevolucao: StatusDevolucao;
  observacoes: string | null;
  epiNomeEntrega: string;
  numeroCAEntrega: string;
  validadeCAEntrega: string;
  colaborador: { id: string; nome: string; setor: string; cpf: string };
  epi: { id: string; nome: string; numeroCA: string };
  usuario: { id: string; nome: string; perfil: "ADMIN" | "ALMOXARIFE" };
};

export function DeliveryReceiptButton({
  entregaId,
  compact = false,
  label = "Comprovante",
}: {
  entregaId: string;
  compact?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EntregaComprovante | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resposta = await fetch(`/api/entregas/${entregaId}`, { cache: "no-store" });
      const json = await resposta.json();

      if (!resposta.ok || !json.ok) {
        throw new Error(json?.error?.message ?? "Não foi possível carregar o comprovante.");
      }

      setData(json.data as EntregaComprovante);
    } catch (falha) {
      setError(falha instanceof Error ? falha.message : "Falha ao carregar o comprovante.");
    } finally {
      setLoading(false);
    }
  }, [entregaId]);

  // Busca sob demanda: só dispara quando o modal é aberto pela primeira vez.
  useEffect(() => {
    if (open && !data && !loading && !error) void carregar();
  }, [open, data, loading, error, carregar]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Descarta o cache: o status/comprovante pode ter mudado desde a
          // última abertura (ex.: devolução registrada em outra aba).
          setData(null);
          setError(null);
          setOpen(true);
        }}
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          compact && "px-2.5",
        )}
        title="Ver comprovante de entrega"
      >
        <FileCheck2 className="h-4 w-4" />
        {compact ? <span className="sr-only">{label}</span> : label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Comprovante de entrega"
        description="Registro digital com assinatura e dados do momento da entrega."
        size="lg"
      >
        {loading ? (
          <div
            className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
            Carregando comprovante...
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-strong">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void carregar()}
              className={buttonVariants({ variant: "secondary" })}
            >
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <Comprovante data={data} />
        ) : null}
      </Modal>
    </>
  );
}

function Comprovante({ data }: { data: EntregaComprovante }) {
  // Defesa em profundidade: mesmo que a API devolva um valor legado/corrompido,
  // o <img> só recebe PNG/JPEG validado e canônico.
  const assinaturaSegura = normalizarAssinatura(data.assinaturaDigital);

  return (
    <div className="space-y-5">
      {/* Resumo visual do ato de entrega */}
      <div className="rounded-2xl border border-brand-border bg-brand-soft/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-strong">
          {formatDateTime(data.dataEntrega)}
        </p>
        <p className="mt-1 text-lg font-bold text-fg">{data.colaborador.nome}</p>
        <p className="text-sm text-muted">
          {data.quantidade} x {data.epiNomeEntrega}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DevolucaoStatusBadge status={data.statusDevolucao} />
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-fg-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-strong" />
            {descricaoValidacao(data)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo icon={<User className="h-4 w-4" />} label="Colaborador">
          {data.colaborador.nome}
        </Campo>
        <Campo icon={<User className="h-4 w-4" />} label="CPF / Setor">
          {formatarCpf(data.colaborador.cpf)} · {data.colaborador.setor}
        </Campo>
        <Campo icon={<HardHat className="h-4 w-4" />} label="EPI na entrega">
          {data.epiNomeEntrega}
        </Campo>
        <Campo icon={<HardHat className="h-4 w-4" />} label="CA na entrega">
          {data.numeroCAEntrega}
        </Campo>
        <Campo icon={<CalendarClock className="h-4 w-4" />} label="Validade do CA na entrega">
          {formatDateOnly(data.validadeCAEntrega)}
        </Campo>
        <Campo icon={<CalendarClock className="h-4 w-4" />} label="Troca prevista">
          {formatDateOnly(data.dataPrevistaTroca)}
        </Campo>
        <Campo icon={<KeyRound className="h-4 w-4" />} label="Validação">
          {descricaoValidacao(data)}
        </Campo>
        <Campo icon={<ShieldCheck className="h-4 w-4" />} label="Registrado por">
          {data.usuario.nome}
        </Campo>
      </div>

      {data.observacoes ? (
        <div className="rounded-xl border border-line bg-surface-muted/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Observações
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-fg-soft">{data.observacoes}</p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <PenLine className="h-3.5 w-3.5" />
          Assinatura digital registrada
        </p>

        {assinaturaSegura ? (
          <div className="overflow-hidden rounded-2xl border border-line bg-white p-3">
            {/* Data URL não se beneficia do otimizador do next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assinaturaSegura}
              alt={`Assinatura digital de ${data.colaborador.nome}`}
              className="mx-auto max-h-48 w-full object-contain"
            />
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Assinatura capturada no tablet em {formatDateTime(data.dataEntrega)}.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface-muted/50 px-4 py-6 text-center text-sm text-muted">
            {data.pinValidado
              ? "Entrega validada por PIN. Nenhuma assinatura visual foi capturada."
              : "Nenhum comprovante visual de assinatura disponível para esta entrega."}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-between">
        <a
          href={`/api/colaboradores/${data.colaborador.id}/ficha-epi`}
          className={buttonVariants({ variant: "outline" })}
          target="_blank"
          rel="noreferrer"
        >
          <Download className="h-4 w-4" />
          Ficha completa em PDF
        </a>
        <p className="self-center text-center text-[11px] text-subtle sm:text-right">
          Registro imutável · {STATUS_DEVOLUCAO_LABELS[data.statusDevolucao]}
        </p>
      </div>
    </div>
  );
}

function descricaoValidacao(data: EntregaComprovante): string {
  if (data.pinValidado && data.assinaturaDigital) return "PIN + assinatura";
  if (data.pinValidado) return "PIN validado";
  if (data.assinaturaDigital) return "Assinatura capturada";
  return "Sem validação digital";
}

function Campo({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-fg">{children}</p>
    </div>
  );
}
