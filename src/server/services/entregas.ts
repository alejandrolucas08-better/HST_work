import bcrypt from "bcryptjs";
import type { SessionUser } from "@/lib/session";
import { addDaysUtc, todayUtcDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { EntregaInput } from "@/lib/validations";
import { DomainError } from "./erros";

export async function registrarEntrega(input: EntregaInput, session: SessionUser) {
  const { colaboradorId, epiId, quantidade, observacoes } = input;
  const pin = input.pin?.trim() ?? "";
  const assinatura = input.assinaturaDigital || null;

  const [colaborador, epi] = await Promise.all([
    prisma.colaborador.findUnique({
      where: { id: colaboradorId },
      select: { id: true, nome: true, status: true, pinHash: true },
    }),
    prisma.epi.findUnique({ where: { id: epiId } }),
  ]);

  if (!colaborador) {
    throw new DomainError("COLABORADOR_NAO_ENCONTRADO", "Colaborador não encontrado.", {
      status: 404,
    });
  }
  if (colaborador.status !== "ATIVO") {
    throw new DomainError(
      "COLABORADOR_INATIVO",
      "Colaborador inativo ou desligado. Entrega bloqueada.",
      { status: 409 },
    );
  }
  if (!epi || !epi.ativo) {
    throw new DomainError("EPI_NAO_ENCONTRADO", "EPI não encontrado ou inativo.", {
      status: 404,
    });
  }

  // Regra crítica de SST: CA vencido bloqueia a entrega (não apenas alerta).
  const validadeCA = new Date(`${epi.dataValidadeCA.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (validadeCA.getTime() < todayUtcDate().getTime()) {
    throw new DomainError(
      "CA_VENCIDO",
      `O CA ${epi.numeroCA} está vencido. A entrega foi bloqueada por segurança.`,
      { status: 409 },
    );
  }

  if (quantidade > epi.quantidadeEstoque) {
    throw new DomainError(
      "ESTOQUE_INSUFICIENTE",
      `Estoque insuficiente. Disponível: ${epi.quantidadeEstoque} unidade(s).`,
      {
        status: 409,
        fieldErrors: {
          quantidade: [`Disponível em estoque: ${epi.quantidadeEstoque}.`],
        },
      },
    );
  }

  if (!pin && !assinatura) {
    throw new DomainError(
      "VALIDACAO_DIGITAL_AUSENTE",
      "Informe o PIN do colaborador ou capture a assinatura digital.",
      { status: 422, fieldErrors: { pin: ["PIN ou assinatura obrigatórios."] } },
    );
  }

  let pinValidado = false;
  if (pin) {
    const confere = await bcrypt.compare(pin, colaborador.pinHash);
    if (!confere) {
      throw new DomainError("PIN_INCORRETO", "PIN incorreto. A entrega não foi registrada.", {
        status: 422,
        fieldErrors: { pin: ["PIN inválido."] },
      });
    }
    pinValidado = true;
  }

  // A data de troca é sempre calculada no servidor; o cliente não a define.
  const dataPrevistaTroca = addDaysUtc(todayUtcDate(), epi.intervaloTrocaDias);

  return prisma.$transaction(async (tx) => {
    // Update condicional garante estoque não negativo em entregas concorrentes.
    const atualizado = await tx.epi.updateMany({
      where: { id: epi.id, ativo: true, quantidadeEstoque: { gte: quantidade } },
      data: { quantidadeEstoque: { decrement: quantidade } },
    });

    if (atualizado.count !== 1) {
      throw new DomainError(
        "ESTOQUE_INSUFICIENTE",
        "O estoque acabou de ser alterado. Atualize a página e tente novamente.",
        { status: 409 },
      );
    }

    const entrega = await tx.entrega.create({
      data: {
        colaboradorId,
        epiId,
        usuarioId: session.userId,
        quantidade,
        dataPrevistaTroca,
        // Snapshot imutável do EPI/CA no ato da entrega: garante que a ficha
        // individual e o comprovante reflitam o que foi efetivamente entregue,
        // mesmo que o cadastro do EPI mude depois (nome, CA ou validade).
        epiNomeEntrega: epi.nome,
        numeroCAEntrega: epi.numeroCA,
        validadeCAEntrega: epi.dataValidadeCA,
        assinaturaDigital: assinatura,
        pinValidado,
        observacoes: observacoes || null,
      },
      include: {
        colaborador: { select: { id: true, nome: true } },
        epi: { select: { id: true, nome: true, numeroCA: true } },
      },
    });

    await tx.movimentacaoEstoque.create({
      data: {
        epiId,
        usuarioId: session.userId,
        entregaId: entrega.id,
        tipo: "SAIDA",
        quantidade,
        motivo: `Entrega para ${colaborador.nome}`,
      },
    });

    return entrega;
  });
}

export async function registrarDevolucao(
  entregaId: string,
  reintegrarEstoque: boolean,
  session: SessionUser,
) {
  const entrega = await prisma.entrega.findUnique({
    where: { id: entregaId },
    select: {
      id: true,
      epiId: true,
      quantidade: true,
      statusDevolucao: true,
      colaborador: { select: { nome: true } },
      epi: { select: { nome: true } },
    },
  });

  if (!entrega) {
    throw new DomainError("ENTREGA_NAO_ENCONTRADA", "Entrega não encontrada.", {
      status: 404,
    });
  }
  if (entrega.statusDevolucao !== "EM_USO") {
    throw new DomainError("ENTREGA_JA_FINALIZADA", "Esta entrega já foi finalizada.", {
      status: 409,
    });
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.entrega.update({
      where: { id: entrega.id },
      data: { statusDevolucao: "DEVOLVIDO" },
    });

    // EPI usado normalmente não volta ao estoque; a reintegração é opcional
    // (ex.: item lacrado) e sempre gera movimentação auditável.
    if (reintegrarEstoque) {
      await tx.epi.update({
        where: { id: entrega.epiId },
        data: { quantidadeEstoque: { increment: entrega.quantidade } },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          epiId: entrega.epiId,
          usuarioId: session.userId,
          entregaId: entrega.id,
          tipo: "DEVOLUCAO",
          quantidade: entrega.quantidade,
          motivo: `Devolução de ${entrega.colaborador.nome}`,
        },
      });
    }

    return updated;
  });
}

export async function obterEntrega(id: string) {
  const entrega = await prisma.entrega.findUnique({
    where: { id },
    include: {
      colaborador: { select: { id: true, nome: true, setor: true, cpf: true } },
      epi: { select: { id: true, nome: true, numeroCA: true } },
      usuario: { select: { id: true, nome: true, perfil: true } },
    },
  });

  if (!entrega) {
    throw new DomainError("ENTREGA_NAO_ENCONTRADA", "Entrega não encontrada.", {
      status: 404,
    });
  }
  return entrega;
}
