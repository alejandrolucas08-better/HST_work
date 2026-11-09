import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-contrast shadow-sm shadow-brand/25 hover:bg-brand-hover active:bg-brand-active",
  secondary:
    "border border-line bg-surface text-fg-soft shadow-sm hover:border-line-strong hover:bg-surface-muted",
  ghost: "text-muted hover:bg-surface-muted hover:text-fg",
  danger: "bg-danger text-danger-contrast shadow-sm hover:bg-danger-hover",
  outline:
    "border border-brand-border bg-brand-soft/50 text-brand-strong hover:border-brand hover:bg-brand-soft",
};

/*
 * Todos os tamanhos têm pelo menos 48px de altura — requisito de toque em
 * tablets, inclusive com luvas. O feedback `active:scale` é puramente CSS para
 * ser instantâneo e não depender de animação JavaScript.
 */
const sizes: Record<Size, string> = {
  sm: "h-12 gap-1.5 rounded-xl px-3 text-xs",
  md: "h-12 gap-2 rounded-xl px-4 text-sm",
  lg: "h-14 gap-2.5 rounded-2xl px-6 text-base",
  icon: "h-12 w-12 rounded-xl",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "inline-flex touch-manipulation select-none items-center justify-center font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button type={type} className={buttonVariants({ variant, size, className })} {...props} />
  );
}
