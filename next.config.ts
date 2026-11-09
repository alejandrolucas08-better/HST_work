import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma e bcrypt precisam do runtime Node (não devem ser bundlados pelo Turbopack).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Assinaturas digitais são enviadas como data URL; 1 MB é suficiente e evita payloads abusivos.
      bodySizeLimit: "2mb",
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
