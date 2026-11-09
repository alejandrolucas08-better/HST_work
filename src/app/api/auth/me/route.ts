import { prisma } from "@/lib/prisma";
import { DomainError } from "@/server/services/erros";
import { exigirSessaoApi, respostaErro, respostaOk } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await exigirSessaoApi();
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        ultimoAcessoEm: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      throw new DomainError("NAO_AUTENTICADO", "Usuário inativo ou inexistente.", {
        status: 401,
      });
    }

    return respostaOk(usuario);
  } catch (error) {
    return respostaErro(error);
  }
}
