import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-sunken px-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-muted">
          <SearchX className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          404
        </p>
        <h1 className="mt-1 text-xl font-bold text-fg">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted">
          O endereço pode ter sido removido ou o registro não existe mais.
        </p>
        <Link href="/dashboard" className={buttonVariants({ className: "mt-6" })}>
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
