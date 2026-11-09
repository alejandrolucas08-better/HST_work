import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DomainError } from "./erros";

// Hash fixo para manter o tempo de resposta equivalente quando o e-mail não existe.
const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function autenticarUsuario(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? DUMMY_HASH);

  // Mensagem genérica: não revela existência do e-mail nem status da conta.
  if (!usuario || !usuario.ativo || !senhaConfere) {
    throw new DomainError("CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos.", {
      status: 401,
    });
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcessoEm: new Date() },
  });

  return usuario;
}
