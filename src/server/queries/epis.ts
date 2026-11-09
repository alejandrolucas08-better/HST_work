import { prisma } from "@/lib/prisma";

export async function getEpis(q?: string) {
  const termo = q?.trim();

  return prisma.epi.findMany({
    where: termo
      ? {
          OR: [
            { nome: { contains: termo, mode: "insensitive" } },
            { numeroCA: { contains: termo, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: {
      _count: {
        select: { entregas: { where: { statusDevolucao: "EM_USO" } } },
      },
    },
  });
}
