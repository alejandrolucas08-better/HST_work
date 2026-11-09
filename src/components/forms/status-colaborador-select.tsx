"use client";

import type { StatusColaborador } from "@prisma/client";
import { alterarStatusColaboradorAction } from "@/server/actions/colaboradores";

export function StatusColaboradorSelect({
  id,
  status,
  podeDesligar,
}: {
  id: string;
  status: StatusColaborador;
  /** Somente ADMIN pode mover o colaborador para DESLIGADO. */
  podeDesligar: boolean;
}) {
  return (
    <form action={alterarStatusColaboradorAction}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        aria-label="Alterar status do colaborador"
        onChange={(event) => {
          const novo = event.target.value;
          if (
            novo === "DESLIGADO" &&
            !window.confirm("Confirmar desligamento? Entregas futuras serão bloqueadas.")
          ) {
            event.target.value = status;
            return;
          }
          event.currentTarget.form?.requestSubmit();
        }}
        className="h-12 min-w-32 touch-manipulation rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-fg-soft shadow-sm outline-none transition hover:bg-surface-muted focus:border-brand focus:ring-4 focus:ring-brand/15 active:scale-95"
      >
        <option value="ATIVO">Ativo</option>
        <option value="INATIVO">Inativo</option>
        {podeDesligar || status === "DESLIGADO" ? (
          <option value="DESLIGADO">Desligado</option>
        ) : null}
      </select>
    </form>
  );
}
