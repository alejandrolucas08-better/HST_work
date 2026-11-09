"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { isTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";

export type { Theme };

type ThemeContextValue = {
  theme: Theme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Aplica o tema no <html>. O script inline em `theme-script.tsx` faz a primeira
 * aplicação antes da pintura; este provider mantém o estado React sincronizado
 * e persiste a escolha no localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setThemeState(isTheme(current) ? current : "light");
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === "light" ? "light" : "dark";

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Navegação privada pode bloquear o localStorage; o tema ainda vale na sessão.
    }
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next === "light" ? "light" : "dark";
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignorado intencionalmente
      }
      return next;
    });
  }, []);

  // Mantém múltiplas abas coerentes quando o operador troca o tema.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isTheme(event.newValue)) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setTheme]);

  const value = useMemo(
    () => ({ theme, mounted, setTheme, cycleTheme }),
    [theme, mounted, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme precisa ser usado dentro de <ThemeProvider>.");
  }
  return context;
}
