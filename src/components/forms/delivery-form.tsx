"use client";

import { useActionState, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  HardHat,
  Search,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DeliveryConfirmModal } from "@/components/delivery/delivery-confirm-modal";
import type { DeliveryColaborador, DeliveryEpi } from "@/components/delivery/types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { initialActionState } from "@/lib/action-state";
import {
  addDaysUtc,
  daysUntil,
  formatDateOnly,
  formatQuantity,
  iniciais,
  mascararCpf,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { registrarEntregaAction } from "@/server/actions/entregas";

/**
 * Schema de UI (React Hook Form + Zod).
 *
 * A validação local dá feedback imediato ao almoxarife, mas NÃO substitui a
 * validação do servidor: a Server Action revalida CPF/PIN/estoque/CA dentro de
 * uma transação. O schema abaixo cobre apenas o que dá para saber no cliente:
 * seleção, quantidade, método ativo e formato do PIN/assinatura.
 */
const entregaUiSchema = z
  .object({
    colaboradorId: z.string().min(1, "Selecione um colaborador."),
    epiId: z.string().min(1, "Selecione um EPI."),
    quantidade: z
      .number()
      .int("Use um número inteiro.")
      .min(1, "Quantidade mínima: 1.")
      .max(999, "Quantidade máxima: 999."),
    metodo: z.enum(["assinatura", "pin"]),
    pin: z.string(),
    assinaturaDigital: z.string(),
    observacoes: z.string().max(1000, "Máximo de 1000 caracteres."),
  })
  .superRefine((data, ctx) => {
    if (data.metodo === "pin" && !/^\d{4,6}$/.test(data.pin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pin"],
        message: "Digite um PIN de 4 a 6 dígitos.",
      });
    }

    if (
      data.metodo === "assinatura" &&
      !/^data:image\/(png|jpeg);base64,/.test(data.assinaturaDigital)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assinaturaDigital"],
        message: "Capture a assinatura na tela antes de confirmar.",
      });
    }
  });

type DeliveryFormValues = z.infer<typeof entregaUiSchema>;

/** Normaliza nome para busca sem diferenciar acentos/maiúsculas. */
function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function somenteDigitos(value: string) {
  return value.replace(/\D/g, "");
}

export function DeliveryForm({
  colaboradores,
  epis,
  hoje,
  initialColaboradorId,
}: {
  colaboradores: DeliveryColaborador[];
  epis: DeliveryEpi[];
  hoje: string;
  initialColaboradorId?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    registrarEntregaAction,
    initialActionState,
  );

  const {
    watch,
    setValue,
    setError,
    clearErrors,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryFormValues>({
    resolver: zodResolver(entregaUiSchema),
    mode: "onChange",
    defaultValues: {
      colaboradorId: initialColaboradorId ?? "",
      epiId: "",
      quantidade: 1,
      metodo: "assinatura",
      pin: "",
      assinaturaDigital: "",
      observacoes: "",
    },
  });

  const values = watch();
  const [colaboradorQuery, setColaboradorQuery] = useState("");
  const [epiQuery, setEpiQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const colaborador = colaboradores.find((item) => item.id === values.colaboradorId);
  const epi = epis.find((item) => item.id === values.epiId);
  const caDias = epi ? daysUntil(epi.dataValidadeCA) : null;
  const caVencido = caDias !== null && caDias < 0;
  const dataPrevista =
    epi && hoje
      ? addDaysUtc(new Date(`${hoje}T00:00:00.000Z`), epi.intervaloTrocaDias)
      : null;

  const colaboradoresFiltrados = useMemo(() => {
    const texto = normalizarTexto(colaboradorQuery);
    const digitos = somenteDigitos(colaboradorQuery);

    return colaboradores.filter((item) => {
      if (!texto) return true;
      return (
        normalizarTexto(item.nome).includes(texto) ||
        (digitos.length > 0 && somenteDigitos(item.cpf).includes(digitos))
      );
    });
  }, [colaboradores, colaboradorQuery]);

  const episFiltrados = useMemo(() => {
    const texto = normalizarTexto(epiQuery);
    if (!texto) return epis;
    return epis.filter(
      (item) =>
        normalizarTexto(item.nome).includes(texto) ||
        normalizarTexto(item.numeroCA).includes(texto),
    );
  }, [epis, epiQuery]);

  const serverError = state.status === "error" ? state.message : undefined;

  const erros = {
    pin: errors.pin?.message ?? state.fieldErrors?.pin?.[0],
    assinaturaDigital:
      errors.assinaturaDigital?.message ?? state.fieldErrors?.assinaturaDigital?.[0],
    quantidade: errors.quantidade?.message ?? state.fieldErrors?.quantidade?.[0],
    observacoes: errors.observacoes?.message ?? state.fieldErrors?.observacoes?.[0],
  };

  const selecionarColaborador = (id: string) => {
    setValue("colaboradorId", id, { shouldValidate: true, shouldDirty: true });
    clearErrors("colaboradorId");
  };

  const selecionarEpi = (item: DeliveryEpi) => {
    if (daysUntil(item.dataValidadeCA) < 0 || item.quantidadeEstoque <= 0) return;

    setValue("epiId", item.id, { shouldValidate: true, shouldDirty: true });
    setValue("quantidade", 1, { shouldValidate: true });
    clearErrors(["epiId", "quantidade"]);
  };

  const alterarMetodo = (metodo: DeliveryFormValues["metodo"]) => {
    setValue("metodo", metodo);
    clearErrors(["pin", "assinaturaDigital"]);
  };

  const abrirConfirmacao = async () => {
    const valido = await trigger(["colaboradorId", "epiId", "quantidade"]);
    if (!valido || !colaborador || !epi || caVencido) return;
    setModalOpen(true);
  };

  const confirmarEntrega = handleSubmit((dados) => {
    if (!epi) return;

    // Guarda local para evitar uma ida ao servidor quando a quantidade excede
    // o saldo. O servidor repete a checagem de forma transacional.
    if (dados.quantidade > epi.quantidadeEstoque) {
      setError("quantidade", {
        message: `Estoque insuficiente. Disponível: ${formatQuantity(epi.quantidadeEstoque)}.`,
      });
      return;
    }

    // A Server Action recebe os mesmos nomes de campos do formulário HTML.
    // Enviamos apenas o método ativo; o servidor exige ao menos um deles.
    const formData = new FormData();
    formData.set("colaboradorId", dados.colaboradorId);
    formData.set("epiId", dados.epiId);
    formData.set("quantidade", String(dados.quantidade));
    formData.set("pin", dados.metodo === "pin" ? dados.pin : "");
    formData.set(
      "assinaturaDigital",
      dados.metodo === "assinatura" ? dados.assinaturaDigital : "",
    );
    formData.set("observacoes", dados.observacoes);

    formAction(formData);
  });

  return (
    <div className="space-y-5">
      {serverError && !modalOpen ? <FormAlert tone="error">{serverError}</FormAlert> : null}

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
          <StepTitle
            step={1}
            title="Quem vai receber?"
            description="Busque por nome ou CPF e toque no card do colaborador."
            icon={<Users className="h-5 w-5" />}
          />

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
            <input
              type="search"
              value={colaboradorQuery}
              onChange={(event) => setColaboradorQuery(event.target.value)}
              placeholder="Nome ou CPF do colaborador..."
              aria-label="Buscar colaborador por nome ou CPF"
              className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-12 text-base text-fg shadow-sm outline-none transition placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
            {colaboradorQuery ? (
              <button
                type="button"
                onClick={() => setColaboradorQuery("")}
                className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-subtle transition hover:bg-surface-muted hover:text-fg active:scale-95"
                aria-label="Limpar busca de colaborador"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              {formatQuantity(colaboradoresFiltrados.length)} de{" "}
              {formatQuantity(colaboradores.length)} colaborador(es)
            </p>
            {colaborador ? (
              <Badge tone="emerald">
                <Check className="h-3.5 w-3.5" />
                Selecionado
              </Badge>
            ) : null}
          </div>

          {state.fieldErrors?.colaboradorId?.[0] ? (
            <p className="mt-2 text-xs font-medium text-danger" role="alert">
              {state.fieldErrors.colaboradorId[0]}
            </p>
          ) : null}

          {colaboradoresFiltrados.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
              <SearchX className="h-7 w-7 text-subtle" />
              <p className="mt-2 text-sm font-semibold text-fg">Nenhum colaborador encontrado</p>
              <p className="mt-0.5 text-xs text-muted">Tente outro nome ou os 11 dígitos do CPF.</p>
            </div>
          ) : (
            <motion.div layout className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {colaboradoresFiltrados.map((item) => {
                  const selected = item.id === values.colaboradorId;
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      type="button"
                      onClick={() => selecionarColaborador(item.id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 340, damping: 28 }}
                      className={cn(
                        "flex min-h-24 w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.98]",
                        selected
                          ? "border-brand bg-brand-soft/50 ring-2 ring-brand/25"
                          : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted",
                      )}
                      aria-pressed={selected}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          selected
                            ? "bg-brand text-brand-contrast"
                            : "bg-surface-sunken text-fg-soft",
                        )}
                      >
                        {iniciais(item.nome)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-fg">
                          {item.nome}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {item.cargo} · {item.setor}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] text-subtle">
                          {mascararCpf(item.cpf)}
                        </span>
                      </span>
                      {selected ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-strong" />
                      ) : null}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {colaborador ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-soft/40 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-contrast">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{colaborador.nome}</p>
                <p className="text-xs text-muted">
                  {colaborador.cargo} · {colaborador.setor}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <StepTitle
              step={2}
              title="Qual EPI será entregue?"
              description="Cards mostram CA, estoque e se a entrega está liberada."
              icon={<HardHat className="h-5 w-5" />}
            />

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={epiQuery}
                onChange={(event) => setEpiQuery(event.target.value)}
                placeholder="Nome ou número do CA..."
                aria-label="Buscar EPI por nome ou número do CA"
                className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-12 text-base text-fg shadow-sm outline-none transition placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
              {epiQuery ? (
                <button
                  type="button"
                  onClick={() => setEpiQuery("")}
                  className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-subtle transition hover:bg-surface-muted hover:text-fg active:scale-95"
                  aria-label="Limpar busca de EPI"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            {state.fieldErrors?.epiId?.[0] ? (
              <p className="mt-2 text-xs font-medium text-danger" role="alert">
                {state.fieldErrors.epiId[0]}
              </p>
            ) : null}

            <motion.div layout className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {episFiltrados.map((item) => {
                  const dias = daysUntil(item.dataValidadeCA);
                  const vencido = dias < 0;
                  const semEstoque = item.quantidadeEstoque <= 0;
                  const indisponivel = vencido || semEstoque;
                  const selected = item.id === values.epiId;
                  const tone = vencido ? "rose" : dias <= 30 ? "amber" : "emerald";

                  return (
                    <motion.button
                      key={item.id}
                      layout
                      type="button"
                      onClick={() => selecionarEpi(item)}
                      disabled={indisponivel}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 340, damping: 28 }}
                      className={cn(
                        "flex min-h-32 w-full flex-col justify-between rounded-2xl border p-3.5 text-left transition active:scale-[0.98]",
                        selected
                          ? "border-brand bg-brand-soft/50 ring-2 ring-brand/25"
                          : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted",
                        indisponivel && "cursor-not-allowed opacity-55 hover:border-line",
                      )}
                      aria-pressed={selected}
                      aria-disabled={indisponivel}
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg-soft">
                            <HardHat className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-fg">
                              {item.nome}
                            </span>
                            <span className="block font-mono text-[11px] text-muted">
                              CA {item.numeroCA}
                            </span>
                          </span>
                        </div>
                        {selected ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-strong" />
                        ) : null}
                      </div>

                      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
                        <Badge tone={tone}>
                          {vencido
                            ? "CA vencido"
                            : dias === 0
                              ? "Vence hoje"
                              : `CA ${dias}d`}
                        </Badge>
                        <span
                          className={cn(
                            "text-xs font-bold",
                            semEstoque ? "text-danger-strong" : "text-fg-soft",
                          )}
                        >
                          {formatQuantity(item.quantidadeEstoque)} em estoque
                        </span>
                      </div>

                      {indisponivel ? (
                        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-danger-strong">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {vencido ? "Entrega bloqueada pelo CA" : "Sem estoque disponível"}
                        </p>
                      ) : null}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {episFiltrados.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
                <SearchX className="h-7 w-7 text-subtle" />
                <p className="mt-2 text-sm font-semibold text-fg">Nenhum EPI encontrado</p>
                <p className="mt-0.5 text-xs text-muted">Tente outro nome ou número de CA.</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
            <StepTitle
              step={3}
              title="Revise e confirme"
              description="A assinatura ou o PIN serão validados na confirmação."
              icon={<ShieldCheck className="h-5 w-5" />}
            />

            {colaborador && epi ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-line bg-surface-muted/60 p-3.5 text-sm">
                  <p className="font-semibold text-fg">
                    {values.quantidade} × {epi.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Para {colaborador.nome} · {colaborador.setor}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={caVencido ? "rose" : caDias !== null && caDias <= 30 ? "amber" : "emerald"}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      CA {caVencido ? "vencido" : `válido por ${caDias}d`}
                    </Badge>
                    <Badge tone="slate">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Troca {dataPrevista ? formatDateOnly(dataPrevista) : "—"}
                    </Badge>
                    <Badge tone={epi.quantidadeEstoque - values.quantidade <= 0 ? "amber" : "slate"}>
                      Saldo após: {formatQuantity(Math.max(0, epi.quantidadeEstoque - values.quantidade))}
                    </Badge>
                  </div>
                </div>

                {caVencido ? (
                  <div className="flex items-start gap-2 rounded-xl border border-danger-border bg-danger-soft px-3.5 py-3 text-xs text-danger-strong">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      O CA deste EPI está vencido. Atualize o cadastro antes de registrar a
                      entrega.
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void abrirConfirmacao()}
                  disabled={caVencido || isPending}
                  className={buttonVariants({ size: "lg", className: "w-full" })}
                >
                  Revisar e confirmar
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                <p className="text-sm font-semibold text-fg">Selecione colaborador e EPI</p>
                <p className="mt-1 text-xs text-muted">
                  O resumo e a validação digital aparecem aqui.
                </p>
              </div>
            )}

            {erros.quantidade ? (
              <p className="mt-2 text-xs font-medium text-danger" role="alert">
                {erros.quantidade}
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {colaborador && epi ? (
        <DeliveryConfirmModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          colaborador={colaborador}
          epi={epi}
          hoje={hoje}
          quantidade={values.quantidade}
          onQuantidadeChange={(value) => {
            setValue("quantidade", value, { shouldValidate: true, shouldDirty: true });
            clearErrors("quantidade");
          }}
          metodo={values.metodo}
          onMetodoChange={alterarMetodo}
          assinatura={values.assinaturaDigital}
          onAssinaturaChange={(value) => {
            setValue("assinaturaDigital", value, { shouldDirty: true });
            clearErrors("assinaturaDigital");
          }}
          pin={values.pin}
          onPinChange={(value) => {
            setValue("pin", value, { shouldDirty: true });
            clearErrors("pin");
          }}
          observacoes={values.observacoes}
          onObservacoesChange={(value) => {
            setValue("observacoes", value, { shouldDirty: true });
            clearErrors("observacoes");
          }}
          pending={isPending}
          caVencido={caVencido}
          serverError={serverError}
          erros={erros}
          onConfirm={() => void confirmarEntrega()}
        />
      ) : null}
    </div>
  );
}

function StepTitle({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">
          Etapa {step}
        </p>
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}
