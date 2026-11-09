import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  errors,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg-soft">
        {label}
      </label>
      {children}
      {hint && !errors?.length ? <p className="text-xs text-muted">{hint}</p> : null}
      {errors?.length ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-3.5 py-3 text-sm",
        tone === "error"
          ? "border-danger-border bg-danger-soft text-danger-strong"
          : "border-brand-border bg-brand-soft text-brand-strong",
      )}
    >
      {children}
    </div>
  );
}
