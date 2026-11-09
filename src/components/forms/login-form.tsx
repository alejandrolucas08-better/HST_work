"use client";

import { useActionState, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { ThemeCycleButton } from "@/components/theme/theme-toggle";
import { FormAlert } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/action-state";
import { loginAction } from "@/server/actions/auth";

const showDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === "true";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <div className="absolute right-4 top-4 z-20">
        <ThemeCycleButton />
      </div>

      <section className="relative hidden overflow-hidden bg-inverse p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.35), transparent 35%), radial-gradient(circle at 80% 70%, rgba(5,150,105,0.25), transparent 40%)",
          }}
        />
        <motion.div
          className="relative flex items-center gap-3"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-contrast shadow-lg shadow-brand/30">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <div className="leading-tight">
            <p className="text-lg font-bold tracking-tight text-inverse-fg">HST EPI</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              Gestão inteligente
            </p>
          </div>
        </motion.div>

        <motion.div
          className="relative max-w-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="mb-3 inline-flex rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            Segurança do trabalho, sem papel
          </p>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-inverse-fg">
            Controle a validade, o estoque e a entrega dos EPIs em um só lugar.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-inverse-muted">
            Entrega digital validada por PIN, assinatura no tablet e alertas automáticos de
            troca e vencimento do CA.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-inverse-muted">
            {[
              "Rastreabilidade completa por colaborador e EPI",
              "Alertas de CA vencido, estoque mínimo e troca prevista",
              "Pronto para tablets no almoxarifado",
            ].map((item, index) => (
              <motion.li
                key={item}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + index * 0.08 }}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  ✓
                </span>
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <p className="relative text-xs text-inverse-muted">
          © {new Date().getFullYear()} HST · Uso interno e autorizado
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-contrast">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-tight text-fg">HST EPI</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                Gestão inteligente
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-surface p-6 shadow-2xl shadow-black/10 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-fg">Acessar painel</h2>
              <p className="mt-1 text-sm text-muted">
                Entre com suas credenciais de almoxarife ou administrador.
              </p>
            </div>

            <form action={formAction} className="space-y-4">
              {state.status === "error" && state.message ? (
                <FormAlert tone="error">{state.message}</FormAlert>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-fg-soft">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    placeholder="nome@empresa.com"
                    required
                    aria-invalid={Boolean(state.fieldErrors?.email)}
                    className="pl-10"
                  />
                </div>
                {state.fieldErrors?.email?.[0] ? (
                  <p className="text-xs font-medium text-danger">{state.fieldErrors.email[0]}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="senha" className="text-sm font-medium text-fg-soft">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="senha"
                    name="senha"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    required
                    aria-invalid={Boolean(state.fieldErrors?.senha)}
                    className="px-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-subtle transition hover:bg-surface-muted hover:text-fg-soft active:scale-95"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {state.fieldErrors?.senha?.[0] ? (
                  <p className="text-xs font-medium text-danger">{state.fieldErrors.senha[0]}</p>
                ) : null}
              </div>

              <SubmitButton className="w-full" size="lg" pendingLabel="Entrando...">
                Entrar no painel
              </SubmitButton>
            </form>

            {showDemo ? (
              <div className="mt-6 rounded-xl border border-dashed border-line bg-surface-muted px-4 py-3 text-xs leading-relaxed text-muted">
                <p className="font-semibold text-fg-soft">Acesso de demonstração</p>
                <p className="mt-1">
                  Admin: <span className="font-mono text-fg-soft">admin@hst.local</span> ·{" "}
                  <span className="font-mono text-fg-soft">Admin@123</span>
                </p>
                <p>
                  Almoxarife:{" "}
                  <span className="font-mono text-fg-soft">almoxarife@hst.local</span> ·{" "}
                  <span className="font-mono text-fg-soft">Almox@123</span>
                </p>
              </div>
            ) : null}
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            Sessão protegida por cookie httpOnly · PIN nunca é exibido após o cadastro
          </p>
        </motion.div>
      </section>
    </div>
  );
}
