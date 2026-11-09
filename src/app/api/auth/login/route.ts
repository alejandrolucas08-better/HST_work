import { createSession } from "@/lib/auth";
import {
  chaveLogin,
  chaveLoginIp,
  configLimiteLogin,
  configLimiteLoginIp,
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
    const chaveEmail = chaveLogin(parsed.data.email, ip);
    const chaveIp = chaveLoginIp(ip);
    const configEmail = configLimiteLogin();
    const configIp = configLimiteLoginIp();
    const limiteEmail = consultarLimite(
      chaveEmail,
      configEmail.maxTentativas,
      configEmail.janelaMs,
    );
    const limiteIp = consultarLimite(chaveIp, configIp.maxTentativas, configIp.janelaMs);
    const retryAfterSeconds = Math.max(
      limiteEmail.retryAfterSeconds,
      limiteIp.retryAfterSeconds,
    );

    if (!limiteEmail.permitido || !limiteIp.permitido) {
      throw new DomainError(
        "MUITAS_TENTATIVAS",
        `Muitas tentativas de login. Tente novamente em ${retryAfterSeconds}s.`,
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }

    try {
      const usuario = await autenticarUsuario(parsed.data.email, parsed.data.senha);
      limparLimite(chaveEmail);
      limparLimite(chaveIp);
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
        registrarFalha(chaveEmail, configEmail.janelaMs);
        registrarFalha(chaveIp, configIp.janelaMs);
      }
      throw error;
    }
  } catch (error) {
    return respostaErro(error);
  }
}
