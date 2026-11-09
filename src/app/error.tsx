"use client";

import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-sunken px-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-strong">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-fg">Algo não saiu como esperado</h1>
        <p className="mt-2 text-sm text-muted">
          Ocorreu um erro ao carregar esta página. Tente novamente; se persistir, avise o
          administrador do sistema.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-subtle">Código do erro: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className={buttonVariants()}>
            Tentar novamente
          </button>
          <a href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            Ir para o painel
          </a>
        </div>
      </div>
    </div>
  );
}
