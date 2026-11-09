import type { NextConfig } from "next";

/**
 * =============================================================================
 * Cabeçalhos de segurança (OWASP Secure Headers)
 * =============================================================================
 * - CSP sem nonce: o app usa um script inline bloqueante para aplicar o tema
 *   antes da primeira pintura (`ThemeScript`), então `'unsafe-inline'` é
 *   necessário. `'unsafe-eval'` fica restrito ao desenvolvimento (Turbopack).
 * - HSTS apenas em produção (em HTTP local ele quebraria o acesso).
 * - `frame-ancestors 'none'` + `X-Frame-Options: DENY` bloqueiam clickjacking.
 * - `nosniff` impede sniffing de MIME; `no-store` em /api evita cache de dados
 *   autenticados (incluindo PDFs e assinaturas).
 * =============================================================================
 */
const producao = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${producao ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${producao ? "" : " ws: wss: http: https:"}`,
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(producao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecalhosSeguranca = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(producao
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Prisma e bcrypt precisam do runtime Node (não devem ser bundlados pelo Turbopack).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Assinaturas digitais são enviadas como data URL; 2 MB cobre o limite
      // validado em `src/lib/signature.ts` (512 KiB decodificados).
      bodySizeLimit: "2mb",
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosSeguranca },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
