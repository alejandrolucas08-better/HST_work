import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-fg shadow-sm outline-none transition placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-subtle md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full appearance-none rounded-xl border border-line bg-surface bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.9rem_center] bg-no-repeat px-3.5 pr-10 text-base text-fg shadow-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface-muted md:text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-fg shadow-sm outline-none transition placeholder:text-subtle focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-danger md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
