import { NextResponse } from "next/server";
import { isoDate } from "@/lib/format";

/**
 * Utilitários de download para as rotas de PDF/CSV.
 * O nome do arquivo é normalizado (sem acentos/espaços) para evitar problemas
 * em navegadores e servidores de e-mail. `filename*` preserva o nome "bonito".
 */
export function nomeArquivo(base: string, extensao: string): string {
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  return `${slug || "documento"}-${isoDate(new Date())}.${extensao}`;
}

function disposicao(nome: string): string {
  return `attachment; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
}

export function respostaPdf(bytes: Uint8Array, nome: string): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposicao(nome),
      "Cache-Control": "no-store",
    },
  });
}

export function respostaCsv(conteudo: string, nome: string): NextResponse {
  return new NextResponse(conteudo, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposicao(nome),
      "Cache-Control": "no-store",
    },
  });
}
