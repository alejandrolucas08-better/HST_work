import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "emerald" | "amber" | "rose" | "slate" | "sky" | "violet";

const tones: Record<Tone, string> = {
  emerald: "border-brand-border bg-brand-soft text-brand-strong",
  amber: "border-warning-border bg-warning-soft text-warning-strong",
  rose: "border-danger-border bg-danger-soft text-danger-strong",
  slate: "border-line bg-surface-muted text-muted",
  sky: "border-info-border bg-info-soft text-info-strong",
  violet: "border-accent-border bg-accent-soft text-accent-strong",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
