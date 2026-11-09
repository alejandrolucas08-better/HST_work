import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme/theme-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Gestão de EPIs`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Gestão inteligente de EPIs com controle de validade do CA, estoque mínimo e entrega digital validada por PIN.",
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
