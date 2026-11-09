import { createSession } from "@/lib/auth";
import {
  chaveLogin,
  configLimiteLogin,
  consultarLimite,
  ipDaRequisicao,
  limparLimite,
  registrarFalha,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import { lerJson, respostaErro, respostaOk } from "@/server/http";
import { autenticarUsuario } from "@/server/services/auth";
import { DomainError, isDomainError } from "@/server/services/erros";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await lerJson(request);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainError("VALIDACAO", "Dados inválidos.", {
        status: 422,
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const ip = ipDaRequisicao(request.headers);
    const chave = chaveLogin(parsed.data.email, ip);
    const { maxTentativas, janelaMs } = configLimiteLogin();
    const limite = consultarLimite(chave, maxTentativas, janelaMs);

    if (!limite.permitido) {
      throw new DomainError(
        "MUITAS_TENTATIVAS",
        `Muitas tentativas de login. Tente novamente em ${limite.retryAfterSeconds}s.`,
        { status: 429 },
      );
    }

    try {
      const usuario = await autenticarUsuario(parsed.data.email, parsed.data.senha);
      limparLimite(chave);
      await createSession({
        userId: usuario.id,
        nome: usuario.nome,
        perfil: usuario.perfil,
      });

      return respostaOk({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      });
    } catch (error) {
      if (isDomainError(error) && error.code === "CREDENCIAIS_INVALIDAS") {
        registrarFalha(chave, janelaMs);
      }
      throw error;
    }
  } catch (error) {
    return respostaErro(error);
  }
}
