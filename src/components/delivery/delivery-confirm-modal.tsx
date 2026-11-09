"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  HardHat,
  KeyRound,
  Loader2,
  Minus,
  PenLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import type { DeliveryMetodo, DeliveryColaborador, DeliveryEpi } from "@/components/delivery/types";
import { PinNumpad } from "@/components/delivery/pin-numpad";
import { SignatureCanvas } from "@/components/delivery/signature-canvas";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  addDaysUtc,
  daysUntil,
  formatDateOnly,
  formatQuantity,
  iniciais,
  mascararCpf,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  colaborador: DeliveryColaborador;
  epi: DeliveryEpi;
  hoje: string;
  quantidade: number;
  onQuantidadeChange: (value: number) => void;
  metodo: DeliveryMetodo;
  onMetodoChange: (metodo: DeliveryMetodo) => void;
  assinatura: string;
  onAssinaturaChange: (value: string) => void;
  pin: string;
  onPinChange: (value: string) => void;
  observacoes: string;
  onObservacoesChange: (value: string) => void;
  pending: boolean;
  caVencido: boolean;
  serverError?: string;
  erros: {
    pin?: string;
    assinaturaDigital?: string;
    quantidade?: string;
    observacoes?: string;
  };
  onConfirm: () => void;
};

/**
 * Modal de confirmação da entrega. As duas abas são alternativas de validação:
 * assinatura em canvas (Base64) ou PIN no teclado virtual. A entrega exige ao
 * menos uma delas — a regra final continua no Zod/Server Action.
 */
export function DeliveryConfirmModal({
  open,
  onClose,
  colaborador,
  epi,
  hoje,
  quantidade,
  onQuantidadeChange,
  metodo,
  onMetodoChange,
  assinatura,
  onAssinaturaChange,
  pin,
  onPinChange,
  observacoes,
  onObservacoesChange,
  pending,
  caVencido,
  serverError,
  erros,
  onConfirm,
}: Props) {
  const diasCA = daysUntil(epi.dataValidadeCA);
  const dataPrevista = addDaysUtc(new Date(`${hoje}T00:00:00.000Z`), epi.intervaloTrocaDias);
  const estoqueMaximo = Math.max(1, Math.min(epi.quantidadeEstoque, 999));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar entrega digital"
      description={`${colaborador.nome} · ${quantidade} × ${epi.nome}`}
      size="xl"
      dismissible={!pending}
    >
      <div className="space-y-5">
        {serverError ? <FormAlert tone="error">{serverError}</FormAlert> : null}

        {caVencido ? (
          <div className="flex items-start gap-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-strong">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Entrega bloqueada por CA vencido</p>
              <p className="mt-0.5 text-xs">
                Atualize o Certificado de Aprovação do EPI antes de registrar a entrega.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-surface-muted/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">
                  {iniciais(colaborador.nome)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{colaborador.nome}</p>
                  <p className="text-xs text-muted">
                    {colaborador.cargo} · {colaborador.setor}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-subtle">
                    CPF {mascararCpf(colaborador.cpf)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <User className="h-4 w-4 text-brand-strong" />
                Colaborador ativo no almoxarifado
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg-soft">
                    <HardHat className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-fg">{epi.nome}</p>
                    <p className="font-mono text-xs text-muted">CA {epi.numeroCA}</p>
                  </div>
                </div>
                <Badge tone={diasCA < 0 ? "rose" : diasCA <= 30 ? "amber" : "emerald"}>
                  {diasCA < 0
                    ? `Vencido há ${Math.abs(diasCA)}d`
                    : diasCA === 0
                      ? "Vence hoje"
                      : `Válido por ${diasCA}d`}
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-muted px-3 py-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-muted">Estoque</dt>
                  <dd className="mt-0.5 text-sm font-bold text-fg">
                    {formatQuantity(epi.quantidadeEstoque)} un.
                  </dd>
                </div>
                <div className="rounded-xl bg-surface-muted px-3 py-2.5">
                  <dt className="font-semibold uppercase tracking-wide text-muted">
                    Troca prevista
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-fg">
                    {formatDateOnly(dataPrevista)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Quantidade da entrega
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onQuantidadeChange(Math.max(1, quantidade - 1))}
                  disabled={quantidade <= 1 || pending}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-fg transition hover:bg-surface-muted active:scale-95 disabled:opacity-40"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-6 w-6" />
                </button>

                <div className="min-w-0 flex-1 text-center">
                  <p className="text-3xl font-bold tabular-nums text-fg">{quantidade}</p>
                  <p className="text-xs text-muted">unidade(s)</p>
                </div>

                <button
                  type="button"
                  onClick={() => onQuantidadeChange(Math.min(estoqueMaximo, quantidade + 1))}
                  disabled={quantidade >= estoqueMaximo || pending}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-fg transition hover:bg-surface-muted active:scale-95 disabled:opacity-40"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
              {erros.quantidade ? (
                <p className="mt-2 text-xs font-medium text-danger" role="alert">
                  {erros.quantidade}
                </p>
              ) : (
                <p className="mt-2 text-center text-[11px] text-muted">
                  Disponível: {formatQuantity(epi.quantidadeEstoque)} unidade(s)
                </p>
              )}
            </section>

            <section>
              <label
                htmlFor="observacoes-entrega"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Observações (opcional)
              </label>
              <Textarea
                id="observacoes-entrega"
                value={observacoes}
                onChange={(event) => onObservacoesChange(event.target.value)}
                placeholder="Ex.: 2 pares por desgaste acelerado."
                maxLength={1000}
                disabled={pending}
                className="min-h-24"
              />
              {erros.observacoes ? (
                <p className="mt-1 text-xs font-medium text-danger" role="alert">
                  {erros.observacoes}
                </p>
              ) : null}
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <div
              role="tablist"
              aria-label="Forma de validação digital"
              className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-muted p-1"
            >
              {(
                [
                  { value: "assinatura" as const, label: "Assinatura", icon: PenLine },
                  { value: "pin" as const, label: "PIN", icon: KeyRound },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = metodo === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onMetodoChange(tab.value)}
                    className={cn(
                      "relative flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98]",
                      active ? "text-brand-contrast" : "text-muted hover:text-fg",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="delivery-validation-tab"
                        className="absolute inset-0 -z-10 rounded-xl bg-brand"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <AnimatePresence mode="wait" initial={false}>
                {metodo === "assinatura" ? (
                  <motion.div
                    key="assinatura"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SignatureCanvas
                      value={assinatura}
                      onChange={onAssinaturaChange}
                      disabled={pending}
                    />
                    {assinatura ? (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-strong">
                        <CheckCircle2 className="h-4 w-4" />
                        Assinatura capturada
                      </p>
                    ) : null}
                    {erros.assinaturaDigital ? (
                      <p className="mt-2 text-xs font-medium text-danger" role="alert">
                        {erros.assinaturaDigital}
                      </p>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="pin"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <PinNumpad
                      value={pin}
                      onChange={onPinChange}
                      disabled={pending}
                      error={erros.pin}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-info-border bg-info-soft px-3 py-2.5 text-[11px] leading-relaxed text-info-strong">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                A baixa no estoque, o histórico e a validação digital são gravados na mesma
                transação. Em caso de falha, nada é alterado.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted">
            <CalendarClock className="h-4 w-4" />
            Troca prevista: {formatDateOnly(dataPrevista)}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Voltar e revisar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending || caVencido}
              className={buttonVariants({ size: "lg", className: "min-w-56" })}
            >
              {pending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Confirmar entrega
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
