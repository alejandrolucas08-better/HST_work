export type Theme = "light" | "dark" | "high-contrast";

export const THEME_STORAGE_KEY = "hst-epi-theme";

export const THEMES: readonly Theme[] = ["light", "dark", "high-contrast"];

export const THEME_LABELS: Record<Theme, string> = {
  light: "Claro",
  dark: "Escuro",
  "high-contrast": "Alto contraste",
};

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "high-contrast";
}
