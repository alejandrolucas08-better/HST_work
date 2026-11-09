"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { registrarDevolucaoAction } from "@/server/actions/entregas";
import { cn } from "@/lib/utils";

export function DevolucaoButton({
  entregaId,
  colaboradorNome,
  epiNome,
  quantidade,
}: {
  entregaId: string;
  colaboradorNome: string;
  epiNome: string;
  quantidade: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Devolver
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar devolução"
        description="A entrega será finalizada e não poderá ser reaberta."
      >
        <form action={registrarDevolucaoAction} className="space-y-4">
          <input type="hidden" name="entregaId" value={entregaId} />

          <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
            <p className="font-semibold text-fg">
              {quantidade} × {epiNome}
            </p>
            <p className="text-muted">Colaborador: {colaboradorNome}</p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3">
            <input
              type="checkbox"
              name="reintegrarEstoque"
              className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand focus:ring-brand"
            />
            <span className="text-sm">
              <span className="block font-medium text-fg">
                Reintegrar ao estoque
              </span>
              <span className="block text-xs text-muted">
                Marque apenas se o item retornar em condições de uso (ex.: lacrado).
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "ghost" })}
            >
              Cancelar
            </button>
            <SubmitButton pendingLabel="Registrando..." variant="danger">
              Confirmar devolução
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
