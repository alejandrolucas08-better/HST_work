"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileChartColumn,
  HardHat,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { ThemeCycleButton, ThemeToggle } from "@/components/theme/theme-toggle";
import { PERFIL_LABELS } from "@/lib/constants";
import { iniciais } from "@/lib/format";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/entregas", label: "Entregas", icon: ClipboardCheck },
  { href: "/epis", label: "EPIs", icon: HardHat },
  { href: "/colaboradores", label: "Colaboradores", icon: Users },
  { href: "/relatorios", label: "Relatórios", icon: FileChartColumn },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-brand text-brand-contrast shadow-lg shadow-brand/30",
          compact ? "h-10 w-10" : "h-11 w-11",
        )}
      >
        <ShieldCheck className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-bold tracking-tight text-inverse-fg",
            compact ? "text-base" : "text-lg",
          )}
        >
          HST EPI
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          Gestão inteligente
        </span>
      </span>
    </Link>
  );
}

function UserCard({ nome, perfil }: { nome: string; perfil: "ADMIN" | "ALMOXARIFE" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
          {iniciais(nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-inverse-fg">{nome}</p>
          <p className="text-xs text-inverse-muted">{PERFIL_LABELS[perfil]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sair da conta"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-inverse-muted transition hover:bg-white/10 hover:text-inverse-fg active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { nome: string; perfil: "ADMIN" | "ALMOXARIFE" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Em tablets na horizontal (>= 768px) a navegação lateral fica fixa. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-inverse px-4 py-5 md:flex lg:w-72">
        <div className="px-2">
          <Brand />
        </div>

        <nav className="mt-8 flex-1 space-y-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition active:scale-[0.98]",
                  isActive(item.href)
                    ? "bg-brand/15 text-inverse-fg ring-1 ring-inset ring-brand/30"
                    : "text-inverse-muted hover:bg-white/[0.07] hover:text-inverse-fg",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive(item.href) ? "text-brand" : "text-inverse-muted",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/entregas/nova"
          className={buttonVariants({ size: "lg", className: "mb-4 w-full" })}
        >
          <Plus className="h-5 w-5" />
          Nova entrega
        </Link>

        <div className="mb-3">
          <ThemeToggle variant="sidebar" />
        </div>

        <UserCard nome={user.nome} perfil={user.perfil} />
      </aside>

      <div className="md:pl-64 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-contrast">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-base font-bold tracking-tight text-fg">HST EPI</span>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeCycleButton />
              <Link
                href="/entregas/nova"
                className={buttonVariants({ size: "sm", className: "px-3" })}
              >
                <Plus className="h-4 w-4" />
                Entrega
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-fg active:scale-95"
                  title="Sair"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Sair</span>
                </button>
              </form>
            </div>
          </div>
          <nav
            className="flex gap-1 overflow-x-auto px-3 pb-2"
            aria-label="Navegação principal"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition active:scale-[0.97]",
                    isActive(item.href)
                      ? "bg-brand-soft text-brand-strong"
                      : "text-muted hover:bg-surface-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="safe-bottom mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
