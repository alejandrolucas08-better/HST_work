import { normalizarCpf } from "@/lib/cpf";
import { prisma } from "@/lib/prisma";

export async function getColaboradores(q?: string) {
  const termo = q?.trim();
  const cpf = termo ? normalizarCpf(termo) : "";

  return prisma.colaborador.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { setor: { contains: termo, mode: "insensitive" } },
            { cargo: { contains: termo, mode: "insensitive" } },
            ...(cpf.length >= 3 ? [{ cpf: { contains: cpf } }] : []),
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { entregas: { where: { statusDevolucao: "EM_USO" } } },
      },
    },
  });
}

export async function getColaborador(id: string) {
  return prisma.colaborador.findUnique({
    where: { id },
    include: {
      entregas: {
        orderBy: { dataEntrega: "desc" },
        include: { epi: true },
      },
    },
  });
}
