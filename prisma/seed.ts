import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Assinatura de exemplo (PNG em Base64) usada no seed para que o comprovante
 * de entrega e a ficha individual já exibam uma imagem real em demonstrações.
 * Em produção a assinatura vem do canvas do tablet (ver `SignaturePad`).
 */
const ASSINATURA_EXEMPLO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAAB4CAYAAAC9x4bVAAAFCUlEQVR42u3dQZIbNxBFQV3BO93A9z8htdJOsskmgPpVyIzwzmGDxBCvAfb0/HgBQIAf3gIABAkABAkAQQIAQQJAkABAkAAQJAAQJAAECQAECQBBAgBBAkCQAECQABAkABAkAAQJAAQJAEECAEECQJAAQJAAECQAECQABAkABAkAQQIAQQJAkABAkAAQpAv98/Nfsw8gSPUx+v0PAIJUHiNRAhCkmBgJEoAgCRIA9wXpbzESJABBsjv6cPx4P0GQ7I5ixo/3EwRJkGLGzp27ZBCkwTFKX4wsoC5KQJAuiVHyYpQ65o4LuBjdMc8IkiBdtIh2vRlEkObPM4IkRpfGqPP3b51+BswzgiRIgjRgoXpn/lNfQ9X4xAhBshh9NHaBvG/+xQhBEiS7uoZBenfuO41djBCk4TESpHlB+q8xdh377nG62QNBKrja67wgVY65S9j/b2zJ8y9GMDBIExckQfp+Me8892KEIA2Jkd3R7CC9O55uu7rd4xQiBMnuqN3u6NXwe60uC3DVnIsRgiRIH4879bguYWy3xGj1WMUIQSqOUbcjm6QxJwbp04W7y3deu8cqRghSyALV6SpZkNbFqEuQKmIkSAhSwe6oU5CSxpw2vqeLapfHL+0apxghSOG7o9SrZEG6M0a7xipGCJKFfUtEb93BfbOoJt8RuHOsQoQgBX7IX42+Q0jfHZ3eea6486xD2FePVYwQJEFaulikH9dVHDM9+e/fdnu6GCFIwQt7+rFN6pgrxrn693HESIwQpKgFM3lh6jbmimOm1f/NxBitGKsYIUhNY5SwMCX/7szJ93fnkwpu+V0pMUKQgmKUuNP4dpE9+Uyzb//fq17fytfbKUbfjFeMEKQmu6OqhSk9RqufELHi3z9xY0RqjFZHHQRp4FHI6RDtHvMnD/TcEdCTDxLt9IfuxAiGBCnp6Cv5VuWnMVqxqE7+EwsVFyBihCA13B1VHn+l3B32TYhWBGlqjKouQMQIQWq6O6o+/qpcUN8d36ow7QpdWpB2vK6nvygtRgiS3VH8F/JPxrciJCl/9bbyyHPHeIUIQbI7Oh6iHa935y7n5K6xKkgndnxPvn8DQWoUo1f4Y21Ox2j14ptyPLdrzk+9NjECQYoL0dMx777VvFOMXgeOO08c/4oRgjQsRq9Nj2OpuI34xPiefo8xJUhVryf1fQRBeuOD2uX4a+eCWnmr+bTjuurXIUbQNEhdjr92ve7K28ynfX+UMn4xgvAgVeyOkhfV6geRdvkeaXVYE+YbBOmi3VHaglCx0K94ykL33WXixQcIUmCUqq76b43R6l+OrYxR8k0DYgRNgvT7A1txtZy0M0y6y+vJjSGpMU+ebxCkYbotTlWhnHLbcbe5XnUSAII0MEjpY658n6bN96STABAki9OxsVe/T5PmGxAkC1ToFfOUxVuIQJAsUAPfq0lzDghSdJCo25GdmndAkFz5AyBIk6/8AQQJAAQJAEECAEECQJDgDzwFARAkYoLT4Q/04YICQTr6ASIvNoJ1z9ze9p5yeZB8kDIXJTssFxKT5svPniC1/DA6TvMauv9837rbciEkSK4cP/ghdrU6K1g3XDClvUa7cUFy/OF45LpgmdM7LxoRJB8sH5zRFxycmTcECV+YXh0szs8fggRXBQsQJAAECQAECQAECQBBAgBBAkCQAECQAECQABAkABAkAAQJAAQJAEECAEECQJAAQJAAECQAeNsvBVz3Z6SWAI4AAAAASUVORK5CYII=";

const hoje = new Date();
const MS_DAY = 86_400_000;

function dataEmDias(dias: number): Date {
  return new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + dias),
  );
}

async function seedUsuarios() {
  const admin = await prisma.usuario.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@hst.local" },
    update: { nome: process.env.SEED_ADMIN_NAME ?? "Administrador HST", perfil: "ADMIN", ativo: true },
    create: {
      nome: process.env.SEED_ADMIN_NAME ?? "Administrador HST",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@hst.local",
      senhaHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "Admin@123", 12),
      perfil: "ADMIN",
    },
  });

  await prisma.usuario.upsert({
    where: { email: process.env.SEED_ALMOXARIFE_EMAIL ?? "almoxarife@hst.local" },
    update: {
      nome: process.env.SEED_ALMOXARIFE_NAME ?? "Almoxarife HST",
      perfil: "ALMOXARIFE",
      ativo: true,
    },
    create: {
      nome: process.env.SEED_ALMOXARIFE_NAME ?? "Almoxarife HST",
      email: process.env.SEED_ALMOXARIFE_EMAIL ?? "almoxarife@hst.local",
      senhaHash: await bcrypt.hash(
        process.env.SEED_ALMOXARIFE_PASSWORD ?? "Almox@123",
        12,
      ),
      perfil: "ALMOXARIFE",
    },
  });

  return admin;
}

async function seedColaboradores() {
  const pinComum = await bcrypt.hash("1234", 12);
  const pinJoao = await bcrypt.hash("4321", 12);

  const dados = [
    {
      nome: "Maria Oliveira dos Santos",
      cpf: "52998224725",
      cargo: "Operadora de produção",
      setor: "Produção",
      status: "ATIVO" as const,
      pinHash: pinComum,
    },
    {
      nome: "João Pereira Lima",
      cpf: "11144477735",
      cargo: "Técnico de segurança do trabalho",
      setor: "SESMT",
      status: "ATIVO" as const,
      pinHash: pinJoao,
    },
    {
      nome: "Carlos Eduardo Souza",
      cpf: "12345678909",
      cargo: "Soldador",
      setor: "Manutenção",
      status: "ATIVO" as const,
      pinHash: pinComum,
    },
    {
      nome: "Ana Costa Ribeiro",
      cpf: "39053344705",
      cargo: "Auxiliar de limpeza",
      setor: "Facilities",
      status: "INATIVO" as const,
      pinHash: pinComum,
    },
  ];

  const colaboradores: Record<string, { id: string }> = {};

  for (const colaborador of dados) {
    const registro = await prisma.colaborador.upsert({
      where: { cpf: colaborador.cpf },
      update: {
        nome: colaborador.nome,
        cargo: colaborador.cargo,
        setor: colaborador.setor,
        status: colaborador.status,
      },
      create: colaborador,
    });
    colaboradores[colaborador.cpf] = registro;
  }

  return colaboradores;
}

async function seedEpis() {
  const dados = [
    {
      nome: "Capacete de segurança classe B",
      numeroCA: "31469",
      dataValidadeCA: dataEmDias(180),
      quantidadeEstoque: 25,
      estoqueMinimo: 10,
      intervaloTrocaDias: 365,
    },
    {
      nome: "Luva de proteção nitrílica",
      numeroCA: "40201",
      dataValidadeCA: dataEmDias(25),
      quantidadeEstoque: 8,
      estoqueMinimo: 15,
      intervaloTrocaDias: 30,
    },
    {
      nome: "Protetor auricular plug",
      numeroCA: "5678",
      dataValidadeCA: dataEmDias(400),
      quantidadeEstoque: 120,
      estoqueMinimo: 30,
      intervaloTrocaDias: 90,
    },
    {
      nome: "Botina de segurança couro",
      numeroCA: "43915",
      dataValidadeCA: dataEmDias(-10),
      quantidadeEstoque: 4,
      estoqueMinimo: 8,
      intervaloTrocaDias: 180,
    },
    {
      nome: "Óculos de proteção incolor",
      numeroCA: "28744",
      dataValidadeCA: dataEmDias(60),
      quantidadeEstoque: 0,
      estoqueMinimo: 5,
      intervaloTrocaDias: 180,
    },
  ];

  const epis: Record<
    string,
    { id: string; nome: string; numeroCA: string; dataValidadeCA: Date }
  > = {};

  for (const epi of dados) {
    const registro = await prisma.epi.upsert({
      where: { numeroCA: epi.numeroCA },
      update: {
        nome: epi.nome,
        dataValidadeCA: epi.dataValidadeCA,
        quantidadeEstoque: epi.quantidadeEstoque,
        estoqueMinimo: epi.estoqueMinimo,
        intervaloTrocaDias: epi.intervaloTrocaDias,
        ativo: true,
      },
      create: epi,
    });
    epis[epi.numeroCA] = registro;
  }

  return epis;
}

async function seedEntregas(
  adminId: string,
  colaboradores: Record<string, { id: string }>,
  epis: Record<
    string,
    { id: string; nome: string; numeroCA: string; dataValidadeCA: Date }
  >,
) {
  const exemplos = [
    {
      marker: "seed:maria-capacete",
      colaboradorCpf: "52998224725",
      epiCA: "31469",
      quantidade: 1,
      dataEntrega: new Date(Date.now() - 60 * MS_DAY),
      dataPrevistaTroca: dataEmDias(305),
      statusDevolucao: "EM_USO" as const,
      comAssinatura: true,
      observacoes: "Entrega inicial — seed de demonstração",
    },
    {
      marker: "seed:maria-luva",
      colaboradorCpf: "52998224725",
      epiCA: "40201",
      quantidade: 2,
      dataEntrega: new Date(Date.now() - 20 * MS_DAY),
      dataPrevistaTroca: dataEmDias(10),
      statusDevolucao: "EM_USO" as const,
      comAssinatura: true,
      observacoes: "Troca programada — seed de demonstração",
    },
    {
      marker: "seed:joao-protetor",
      colaboradorCpf: "11144477735",
      epiCA: "5678",
      quantidade: 1,
      dataEntrega: new Date(Date.now() - 10 * MS_DAY),
      dataPrevistaTroca: dataEmDias(80),
      statusDevolucao: "EM_USO" as const,
      comAssinatura: false,
      observacoes: "Entrega de rotina — seed de demonstração",
    },
    {
      marker: "seed:carlos-botina",
      colaboradorCpf: "12345678909",
      epiCA: "43915",
      quantidade: 1,
      dataEntrega: new Date(Date.now() - 200 * MS_DAY),
      dataPrevistaTroca: dataEmDias(-20),
      statusDevolucao: "EM_USO" as const,
      comAssinatura: true,
      observacoes: "Troca atrasada — seed de demonstração",
    },
    {
      marker: "seed:ana-oculos",
      colaboradorCpf: "39053344705",
      epiCA: "28744",
      quantidade: 1,
      dataEntrega: new Date(Date.now() - 40 * MS_DAY),
      dataPrevistaTroca: dataEmDias(140),
      statusDevolucao: "DEVOLVIDO" as const,
      comAssinatura: true,
      observacoes: "Devolvido em desligamento — seed de demonstração",
    },
  ];

  for (const exemplo of exemplos) {
    const existente = await prisma.entrega.findFirst({
      where: { observacoes: exemplo.observacoes },
      select: { id: true },
    });
    if (existente) continue;

    const colaborador = colaboradores[exemplo.colaboradorCpf];
    const epi = epis[exemplo.epiCA];
    if (!colaborador || !epi) continue;

    await prisma.$transaction(async (tx) => {
      const entrega = await tx.entrega.create({
        data: {
          colaboradorId: colaborador.id,
          epiId: epi.id,
          usuarioId: adminId,
          quantidade: exemplo.quantidade,
          dataEntrega: exemplo.dataEntrega,
          dataPrevistaTroca: exemplo.dataPrevistaTroca,
          // Snapshot do EPI/CA no momento da entrega (auditoria histórica).
          epiNomeEntrega: epi.nome,
          numeroCAEntrega: epi.numeroCA,
          validadeCAEntrega: epi.dataValidadeCA,
          assinaturaDigital: exemplo.comAssinatura ? ASSINATURA_EXEMPLO : null,
          pinValidado: !exemplo.comAssinatura,
          statusDevolucao: exemplo.statusDevolucao,
          observacoes: exemplo.observacoes,
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          epiId: epi.id,
          usuarioId: adminId,
          entregaId: entrega.id,
          tipo: "SAIDA",
          quantidade: exemplo.quantidade,
          motivo: "Seed de demonstração",
        },
      });
    });
  }
}

async function main() {
  const admin = await seedUsuarios();
  const colaboradores = await seedColaboradores();
  const epis = await seedEpis();
  await seedEntregas(admin.id, colaboradores, epis);

  console.log("Seed concluído.");
  console.log(`Admin: ${process.env.SEED_ADMIN_EMAIL ?? "admin@hst.local"}`);
  console.log(`Almoxarife: ${process.env.SEED_ALMOXARIFE_EMAIL ?? "almoxarife@hst.local"}`);
  console.log("PINs de demonstração: 1234 (Maria/Carlos/Ana) e 4321 (João).");
}

main()
  .catch((error) => {
    console.error("Falha no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
