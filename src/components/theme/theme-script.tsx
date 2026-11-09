import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Script bloqueante executado antes da primeira pintura. Evita o "flash" claro
 * ao abrir a aplicação no modo escuro/alto contraste.
 */
export function ThemeScript() {
  const script = `(function(){try{var key=${JSON.stringify(THEME_STORAGE_KEY)};var saved=localStorage.getItem(key);var valid=saved==="light"||saved==="dark"||saved==="high-contrast";var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=valid?saved:(prefersDark?"dark":"light");document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="light";}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
