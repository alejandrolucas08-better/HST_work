"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Contrast, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { THEMES, THEME_LABELS, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  "high-contrast": Contrast,
};

/**
 * Alternador triplo. No tablet os três alvos ficam sempre visíveis (48px);
 * a seleção desliza com layout animation e é anunciada por aria-pressed.
 */
export function ThemeToggle({
  variant = "surface",
  className,
}: {
  variant?: "surface" | "sidebar";
  className?: string;
}) {
  const { theme, mounted, setTheme } = useTheme();
  const isSidebar = variant === "sidebar";

  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className={cn(
        "flex items-center gap-1 rounded-2xl border p-1",
        isSidebar ? "border-white/15 bg-white/[0.06]" : "border-line bg-surface",
        className,
      )}
    >
      {THEMES.map((item) => {
        const Icon = ICONS[item];
        const active = mounted && theme === item;

        return (
          <button
            key={item}
            type="button"
            onClick={() => setTheme(item)}
            aria-pressed={active}
            title={THEME_LABELS[item]}
            className={cn(
              "relative isolate flex h-12 min-w-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-colors active:scale-95",
              active
                ? "text-brand-contrast"
                : isSidebar
                  ? "text-inverse-muted hover:bg-white/10 hover:text-inverse-fg"
                  : "text-muted hover:bg-surface-muted hover:text-fg",
            )}
          >
            {active ? (
              <motion.span
                layoutId={isSidebar ? "theme-pill-sidebar" : "theme-pill-surface"}
                className="absolute inset-0 -z-10 rounded-xl bg-brand"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">{THEME_LABELS[item]}</span>
            <span className="sr-only lg:hidden">{THEME_LABELS[item]}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Versão compacta para cabeçalhos móveis: um único botão de 48px que percorre
 * Claro → Escuro → Alto contraste.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { theme, mounted, cycleTheme } = useTheme();
  const Icon = ICONS[theme];

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-fg active:scale-95",
        className,
      )}
      aria-label={mounted ? `Tema atual: ${THEME_LABELS[theme]}. Trocar tema.` : "Trocar tema"}
      title={mounted ? THEME_LABELS[theme] : "Trocar tema"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.16 }}
        >
          <Icon className="h-5 w-5" />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
