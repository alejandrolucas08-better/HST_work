import { requireSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O layout é a primeira barreira de navegação; cada Server Action também
  // revalida a sessão (nunca confiar apenas no roteamento).
  const session = await requireSession();

  return (
    <AppShell user={{ nome: session.nome, perfil: session.perfil }}>{children}</AppShell>
  );
}
