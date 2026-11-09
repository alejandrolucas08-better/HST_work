import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchForm({
  action,
  placeholder,
  defaultValue,
  label = "Buscar",
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  label?: string;
}) {
  return (
    <form action={action} className="flex w-full gap-2 sm:max-w-md">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={label}
          className="pl-9 pr-9"
        />
        {defaultValue ? (
          <Link
            href={action}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition hover:bg-surface-sunken hover:text-fg-soft active:scale-95"
          >
            <X className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      <button
        type="submit"
        className="h-12 shrink-0 touch-manipulation rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-fg-soft shadow-sm transition hover:bg-surface-muted active:scale-95"
      >
        Buscar
      </button>
    </form>
  );
}
