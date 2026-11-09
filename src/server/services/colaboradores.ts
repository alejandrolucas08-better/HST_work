import { Prisma, type StatusColaborador } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ColaboradorInput, ColaboradorUpdateInput } from "@/lib/validations";
import { DomainError } from "./erros";

function tratarCpfDuplicado(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new DomainError("CPF_DUPLICADO", "Já existe um colaborador com este CPF.", {
      status: 409,
      fieldErrors: { cpf: ["CPF já cadastrado."] },
    });
  }
  throw error;
}

export async function criarColaborador(input: ColaboradorInput) {
  const { pin, ...dados } = input;

  try {
    return await prisma.colaborador.create({
      data: { ...dados, pinHash: await bcrypt.hash(pin, 12) },
    });
  } catch (error) {
    tratarCpfDuplicado(error);
  }
}

export async function atualizarColaborador(id: string, input: ColaboradorUpdateInput) {
  const existente = await prisma.colaborador.findUnique({ where: { id }, select: { id: true } });
  if (!existente) {
    throw new DomainError("COLABORADOR_NAO_ENCONTRADO", "Colaborador não encontrado.", {
      status: 404,
    });
  }

  const { pin, ...dados } = input;
  const data: Prisma.ColaboradorUpdateInput = { ...dados };

  // PIN em branco preserva o hash atual; um novo PIN é sempre regravado com bcrypt.
  if (pin) data.pinHash = await bcrypt.hash(pin, 12);

  try {
    return await prisma.colaborador.update({ where: { id }, data });
  } catch (error) {
    tratarCpfDuplicado(error);
  }
}

export async function alterarStatusColaborador(id: string, status: StatusColaborador) {
  const existente = await prisma.colaborador.findUnique({ where: { id }, select: { id: true } });
  if (!existente) {
    throw new DomainError("COLABORADOR_NAO_ENCONTRADO", "Colaborador não encontrado.", {
      status: 404,
    });
  }

  return prisma.colaborador.update({ where: { id }, data: { status } });
}

/**
 * Exclusão lógica: o histórico de entregas é dado de SST e não deve ser apagado.
 * O colaborador fica DESLIGADO e não pode receber novas entregas.
 */
export async function arquivarColaborador(id: string) {
  return alterarStatusColaborador(id, "DESLIGADO");
}
