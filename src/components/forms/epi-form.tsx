"use client";

import { useActionState, useEffect, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { initialActionState } from "@/lib/action-state";
import { addDaysUtc, isoDate, todayUtcDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  alterarAtivoEpiAction,
  atualizarEpiAction,
  criarEpiAction,
} from "@/server/actions/epis";

export type EpiFormValues = {
  id: string;
  nome: string;
  numeroCA: string;
  dataValidadeCA: Date | string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  intervaloTrocaDias: number;
  ativo: boolean;
};

export function NovoEpiButton() {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  return (
    <>
      <Button
        onClick={() => {
          setInstance((value) => value + 1);
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Novo EPI
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cadastrar EPI"
        description="A validade do CA alimenta os alertas automáticos do painel."
        size="lg"
      >
        <EpiForm key={instance} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function EditarEpiButton({
  epi,
  podeAlterarSituacao,
}: {
  epi: EpiFormValues;
  podeAlterarSituacao: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInstance((value) => value + 1);
          setOpen(true);
        }}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
      >
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar EPI"
        description="Alterações manuais de estoque geram um registro de ajuste na auditoria."
        size="lg"
      >
        <EpiForm
          key={instance}
          epi={epi}
          podeAlterarSituacao={podeAlterarSituacao}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function EpiForm({
  epi,
  podeAlterarSituacao = false,
  onSuccess,
}: {
  epi?: EpiFormValues;
  podeAlterarSituacao?: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    epi ? atualizarEpiAction : criarEpiAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {epi ? <input type="hidden" name="id" value={epi.id} /> : null}

      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Nome do EPI" htmlFor="nome" errors={state.fieldErrors?.nome}>
          <Input
            id="nome"
            name="nome"
            defaultValue={epi?.nome}
            placeholder="Ex.: Luva de proteção nitrílica"
            required
            aria-invalid={Boolean(state.fieldErrors?.nome)}
          />
        </Field>
        <Field
          label="Número do CA"
          htmlFor="numeroCA"
          hint="Certificado de Aprovação."
          errors={state.fieldErrors?.numeroCA}
        >
          <Input
            id="numeroCA"
            name="numeroCA"
            defaultValue={epi?.numeroCA}
            placeholder="Ex.: 31469"
            required
            aria-invalid={Boolean(state.fieldErrors?.numeroCA)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
        <Field
          label="Validade do CA"
          htmlFor="dataValidadeCA"
          errors={state.fieldErrors?.dataValidadeCA}
        >
          <Input
            id="dataValidadeCA"
            name="dataValidadeCA"
            type="date"
            defaultValue={
              epi ? isoDate(epi.dataValidadeCA) : isoDate(addDaysUtc(todayUtcDate(), 365))
            }
            required
            aria-invalid={Boolean(state.fieldErrors?.dataValidadeCA)}
          />
        </Field>
        {epi && podeAlterarSituacao ? (
          <Field label="Situação" htmlFor="ativo" errors={state.fieldErrors?.ativo}>
            <Select id="ativo" name="ativo" defaultValue={epi.ativo ? "true" : "false"}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </Select>
          </Field>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={epi ? "Estoque atual" : "Estoque inicial"}
          htmlFor="quantidadeEstoque"
          errors={state.fieldErrors?.quantidadeEstoque}
        >
          <Input
            id="quantidadeEstoque"
            name="quantidadeEstoque"
            type="number"
            min={0}
            step={1}
            defaultValue={epi?.quantidadeEstoque ?? 0}
            required
            aria-invalid={Boolean(state.fieldErrors?.quantidadeEstoque)}
          />
        </Field>
        <Field
          label="Estoque mínimo"
          htmlFor="estoqueMinimo"
          errors={state.fieldErrors?.estoqueMinimo}
        >
          <Input
            id="estoqueMinimo"
            name="estoqueMinimo"
            type="number"
            min={0}
            step={1}
            defaultValue={epi?.estoqueMinimo ?? 5}
            required
            aria-invalid={Boolean(state.fieldErrors?.estoqueMinimo)}
          />
        </Field>
        <Field
          label="Troca a cada (dias)"
          htmlFor="intervaloTrocaDias"
          errors={state.fieldErrors?.intervaloTrocaDias}
        >
          <Input
            id="intervaloTrocaDias"
            name="intervaloTrocaDias"
            type="number"
            min={1}
            max={3650}
            step={1}
            defaultValue={epi?.intervaloTrocaDias ?? 90}
            required
            aria-invalid={Boolean(state.fieldErrors?.intervaloTrocaDias)}
          />
        </Field>
      </div>

      <p className="rounded-xl bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-muted">
        A data prevista de troca é calculada no momento da entrega (data + intervalo). O estoque
        inicial gera entrada; edições manuais de saldo geram um ajuste auditável.
      </p>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onSuccess} type="button">
          Cancelar
        </Button>
        <SubmitButton pendingLabel={epi ? "Salvando..." : "Cadastrando..."}>
          {epi ? "Salvar alterações" : "Cadastrar EPI"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function AlternarSituacaoEpiButton({
  epi,
}: {
  epi: Pick<EpiFormValues, "id" | "nome" | "ativo">;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(alterarAtivoEpiAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state.status]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: "sm",
            className: epi.ativo ? "text-danger-strong" : "text-brand-strong",
          }),
        )}
      >
        {epi.ativo ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {epi.ativo ? "Arquivar" : "Reativar"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={epi.ativo ? "Arquivar EPI" : "Reativar EPI"}
        description={
          epi.ativo
            ? "O EPI deixa de aparecer para novas entregas, mas o histórico é preservado."
            : "O EPI volta a ficar disponível para novas entregas."
        }
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={epi.id} />
          <input type="hidden" name="ativo" value={String(!epi.ativo)} />
          {state.status === "error" && state.message ? (
            <FormAlert tone="error">{state.message}</FormAlert>
          ) : null}
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
            <strong className="text-fg">{epi.nome}</strong>{" "}
            {epi.ativo
              ? "não poderá ser entregue enquanto estiver arquivado."
              : "voltará a aceitar entregas."}
          </p>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant={epi.ativo ? "danger" : "primary"} pendingLabel="Salvando...">
              {epi.ativo ? "Confirmar arquivamento" : "Confirmar reativação"}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
