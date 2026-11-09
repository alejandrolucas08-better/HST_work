"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, UserX } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { initialActionState } from "@/lib/action-state";
import { formatarCpf } from "@/lib/cpf";
import { cn } from "@/lib/utils";
import {
  arquivarColaboradorAction,
  atualizarColaboradorAction,
  criarColaboradorAction,
} from "@/server/actions/colaboradores";

export type ColaboradorFormValues = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  setor: string;
  status: "ATIVO" | "INATIVO" | "DESLIGADO";
};

export function NovoColaboradorButton({ podeDesligar = true }: { podeDesligar?: boolean }) {
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
        Novo colaborador
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cadastrar colaborador"
        description="O PIN é pessoal e será solicitado (ou substituído pela assinatura) em cada entrega."
      >
        <ColaboradorForm
          key={instance}
          podeDesligar={podeDesligar}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function EditarColaboradorButton({
  colaborador,
  podeDesligar,
}: {
  colaborador: ColaboradorFormValues;
  podeDesligar: boolean;
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
        title="Editar colaborador"
        description="Deixe o PIN em branco para manter o código atual."
        size="lg"
      >
        <ColaboradorForm
          key={instance}
          colaborador={colaborador}
          podeDesligar={podeDesligar}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function ColaboradorForm({
  colaborador,
  podeDesligar,
  onSuccess,
}: {
  colaborador?: ColaboradorFormValues;
  podeDesligar: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(
    colaborador ? atualizarColaboradorAction : criarColaboradorAction,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {colaborador ? <input type="hidden" name="id" value={colaborador.id} /> : null}

      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <Field label="Nome completo" htmlFor="nome" errors={state.fieldErrors?.nome}>
        <Input
          id="nome"
          name="nome"
          defaultValue={colaborador?.nome}
          placeholder="Ex.: Maria Oliveira dos Santos"
          autoComplete="off"
          required
          aria-invalid={Boolean(state.fieldErrors?.nome)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="CPF"
          htmlFor="cpf"
          hint="Identificador único do colaborador."
          errors={state.fieldErrors?.cpf}
        >
          <Input
            id="cpf"
            name="cpf"
            defaultValue={colaborador ? formatarCpf(colaborador.cpf) : undefined}
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            required
            aria-invalid={Boolean(state.fieldErrors?.cpf)}
          />
        </Field>
        <Field
          label={colaborador ? "Novo PIN (opcional)" : "PIN de entrega"}
          htmlFor="pin"
          hint={
            colaborador
              ? "Preencha apenas se quiser redefinir o PIN."
              : "4 a 6 dígitos, usado na validação da entrega."
          }
          errors={state.fieldErrors?.pin}
        >
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            placeholder="••••"
            autoComplete="new-password"
            required={!colaborador}
            aria-invalid={Boolean(state.fieldErrors?.pin)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo" htmlFor="cargo" errors={state.fieldErrors?.cargo}>
          <Input
            id="cargo"
            name="cargo"
            defaultValue={colaborador?.cargo}
            placeholder="Ex.: Operador de produção"
            required
            aria-invalid={Boolean(state.fieldErrors?.cargo)}
          />
        </Field>
        <Field label="Setor" htmlFor="setor" errors={state.fieldErrors?.setor}>
          <Input
            id="setor"
            name="setor"
            defaultValue={colaborador?.setor}
            placeholder="Ex.: Produção"
            required
            aria-invalid={Boolean(state.fieldErrors?.setor)}
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="status" errors={state.fieldErrors?.status}>
        <Select id="status" name="status" defaultValue={colaborador?.status ?? "ATIVO"}>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          {podeDesligar || colaborador?.status === "DESLIGADO" ? (
            <option value="DESLIGADO">Desligado</option>
          ) : null}
        </Select>
      </Field>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={onSuccess} type="button">
          Cancelar
        </Button>
        <SubmitButton pendingLabel={colaborador ? "Salvando..." : "Cadastrando..."}>
          {colaborador ? "Salvar alterações" : "Cadastrar colaborador"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ArquivarColaboradorButton({
  colaborador,
}: {
  colaborador: ColaboradorFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(arquivarColaboradorAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") setOpen(false);
  }, [state.status]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm", className: "text-danger-strong" }))}
      >
        <UserX className="h-3.5 w-3.5" />
        Arquivar
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Arquivar colaborador"
        description="O histórico de entregas será preservado. O colaborador ficará como desligado."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={colaborador.id} />
          {state.status === "error" && state.message ? (
            <FormAlert tone="error">{state.message}</FormAlert>
          ) : null}
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">
            <strong className="text-fg">{colaborador.nome}</strong> não poderá receber
            novas entregas, mas todo o histórico permanece disponível para auditoria.
          </p>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <SubmitButton variant="danger" pendingLabel="Arquivando...">
              Confirmar arquivamento
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
