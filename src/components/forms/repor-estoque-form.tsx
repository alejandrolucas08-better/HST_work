"use client";

import { useActionState, useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { initialActionState } from "@/lib/action-state";
import { reporEstoqueAction } from "@/server/actions/epis";
import { cn } from "@/lib/utils";

export function ReporEstoqueButton({
  epiId,
  epiNome,
  estoqueAtual,
}: {
  epiId: string;
  epiNome: string;
  estoqueAtual: number;
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
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <PackagePlus className="h-3.5 w-3.5" />
        Repor
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Repor estoque"
        description={`${epiNome} · saldo atual: ${estoqueAtual} unidade(s).`}
      >
        <ReporForm key={instance} epiId={epiId} onSuccess={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function ReporForm({
  epiId,
  onSuccess,
}: {
  epiId: string;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(reporEstoqueAction, initialActionState);

  useEffect(() => {
    if (state.status === "success") onSuccess();
  }, [state.status, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="epiId" value={epiId} />

      {state.status === "error" && state.message ? (
        <FormAlert tone="error">{state.message}</FormAlert>
      ) : null}

      <Field
        label="Quantidade a adicionar"
        htmlFor={`quantidade-${epiId}`}
        errors={state.fieldErrors?.quantidade}
      >
        <Input
          id={`quantidade-${epiId}`}
          name="quantidade"
          type="number"
          min={1}
          step={1}
          defaultValue={10}
          required
          aria-invalid={Boolean(state.fieldErrors?.quantidade)}
        />
      </Field>

      <Field
        label="Motivo / nota fiscal (opcional)"
        htmlFor={`motivo-${epiId}`}
        errors={state.fieldErrors?.motivo}
      >
        <Input
          id={`motivo-${epiId}`}
          name="motivo"
          placeholder="Ex.: NF 1234 — reposição mensal"
          maxLength={255}
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" onClick={onSuccess} className={buttonVariants({ variant: "ghost" })}>
          Cancelar
        </button>
        <SubmitButton pendingLabel="Repondo...">Confirmar reposição</SubmitButton>
      </div>
    </form>
  );
}
