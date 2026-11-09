"use client";

import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const widths = {
  md: "sm:max-w-xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
} as const;

/**
 * Modal glassmorphism com entrada/saída em Framer Motion. O painel usa
 * `backdrop-filter` e uma borda translúcida; no tema de alto contraste as
 * variáveis trocam o vidro por preto opaco com borda amarela.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: keyof typeof widths;
  dismissible?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, dismissible]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal-root"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.button
            type="button"
            aria-label="Fechar janela"
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-overlay backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "glass-panel relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl",
              widths[size],
            )}
            initial={{ opacity: 0, y: 42, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-glass-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-fg">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-0.5 text-sm text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={!dismissible}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-fg active:scale-95 disabled:opacity-40"
                aria-label="Fechar janela"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
