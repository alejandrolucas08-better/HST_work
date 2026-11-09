import Link from "next/link";
import { AlertTriangle, ArrowLeft, HardHat, Users } from "lucide-react";
import { DeliveryForm } from "@/components/forms/delivery-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { isoDate, todayUtcDate } from "@/lib/format";
import { uuidSchema } from "@/lib/validations";
import { getNovaEntregaData } from "@/server/queries/entregas";

export const metadata = { title: "Nova entrega" };

export default async function NovaEntregaPage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string | string[] }>;
}) {
  const [{ colaborador }, data] = await Promise.all([searchParams, getNovaEntregaData()]);
  const candidato = Array.isArray(colaborador) ? colaborador[0] : colaborador;
  const idParsed = uuidSchema.safeParse(candidato);
  const colaboradorInicial =
    idParsed.success && data.colaboradores.some((item) => item.id === idParsed.data)
      ? idParsed.data
      : undefined;

  const semDados = data.colaboradores.length === 0 || data.epis.length === 0;

  return (
    <div className="space-y-5">
      <Link
        href="/entregas"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para entregas
      </Link>

      <PageHeader
        title="Nova entrega digital"
        description="Valide o PIN do colaborador, capture a assinatura e baixe o estoque em uma única operação."
      />

      {semDados ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-strong">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-fg">
                Não há dados suficientes para uma entrega
              </p>
              <p className="mt-1 text-sm text-muted">
                É necessário pelo menos um colaborador ativo e um EPI com estoque disponível.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.colaboradores.length === 0 ? (
                  <Link href="/colaboradores" className={buttonVariants({ size: "sm" })}>
                    <Users className="h-4 w-4" />
                    Cadastrar colaborador
                  </Link>
                ) : null}
                {data.epis.length === 0 ? (
                  <Link href="/epis" className={buttonVariants({ size: "sm" })}>
                    <HardHat className="h-4 w-4" />
                    Cadastrar/repor EPI
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <DeliveryForm
          colaboradores={data.colaboradores}
          epis={data.epis}
          hoje={isoDate(todayUtcDate())}
          initialColaboradorId={colaboradorInicial}
        />
      )}
    </div>
  );
}
