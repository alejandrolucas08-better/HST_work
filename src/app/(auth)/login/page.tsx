import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <LoginForm />;
}
