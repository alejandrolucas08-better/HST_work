"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  HardHat,
  PackageX,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CaValidadeBadge, DevolucaoStatusBadge, TrocaBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  daysUntil,
  formatDateOnly,
  formatLongDate,
  formatQuantity,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardViewData = {
  hoje: string;
  kpis: {
    colaboradoresAtivos: number;
    episAtivos: number;
    entregasNoMes: number;
    itensEmUso: number;
    caVencidos: number;
    caAVencer: number;
    estoqueCritico: number;
    trocasAtrasadas: number;
    trocasProximas: number;
    alertas: number;
  };
  caAlerts: Array<{
    id: string;
    nome: string;
    numeroCA: string;
    dataValidadeCA: string;
    quantidadeEstoque: number;
  }>;
  estoqueBaixo: Array<{
    id: string;
    nome: string;
    numeroCA: string;
    quantidadeEstoque: number;
    estoqueMinimo: number;
  }>;
  proximasTrocas: Array<{
    id: string;
    dataPrevistaTroca: string;
    colaborador: { id: string; nome: string; setor: string };
    epi: { id: string; nome: string };
  }>;
  entregasRecentes: Array<{
    id: string;
    dataEntrega: string;
    dataPrevistaTroca: string;
    statusDevolucao: "EM_USO" | "DEVOLVIDO" | "TROCADO" | "PERDIDO";
    colaborador: { id: string; nome: string };
    epi: { id: string; nome: string };
  }>;
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 24 },
  },
};

const kpiTones = {
  brand: "bg-brand-soft text-brand-strong",
  danger: "bg-danger-soft text-danger-strong",
  warning: "bg-warning-soft text-warning-strong",
  info: "bg-info-soft text-info-strong",
} as const;

type KpiTone = keyof typeof kpiTones;

type AlertSeverity = "critical" | "warning";
type AlertFilter = "all" | "critical";

type QuickAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  badge: string;
  href: string;
  icon: "ca" | "estoque" | "troca";
};

const alertIcons = {
  ca: ShieldAlert,
  estoque: PackageX,
  troca: CalendarClock,
};

export function DashboardView({ data }: { data: DashboardViewData }) {
  const [filter, setFilter] = useState<AlertFilter>("all");

  const alerts = useMemo<QuickAlert[]>(() => {
    const items: QuickAlert[] = [];

    for (const epi of data.caAlerts) {
      const dias = daysUntil(epi.dataValidadeCA);
      const vencido = dias < 0;
      items.push({
        id: `ca-${epi.id}`,
        severity: vencido ? "critical" : "warning",
        title: epi.nome,
        description: `CA ${epi.numeroCA} · validade ${formatDateOnly(epi.dataValidadeCA)}`,
        badge: vencido ? `Vencido há ${Math.abs(dias)}d` : dias === 0 ? "Vence hoje" : `Vence em ${dias}d`,
        href: "/epis",
        icon: "ca",
      });
    }

    for (const epi of data.estoqueBaixo) {
      const semEstoque = epi.quantidadeEstoque === 0;
      items.push({
        id: `estoque-${epi.id}`,
        severity: semEstoque ? "critical" : "warning",
        title: epi.nome,
        description: `Saldo ${formatQuantity(epi.quantidadeEstoque)} · mínimo ${formatQuantity(epi.estoqueMinimo)}`,
        badge: semEstoque ? "Sem estoque" : "Estoque baixo",
        href: "/epis",
        icon: "estoque",
      });
    }

    for (const entrega of data.proximasTrocas) {
      const dias = daysUntil(entrega.dataPrevistaTroca);
      const atrasada = dias < 0;
      items.push({
        id: `troca-${entrega.id}`,
        severity: atrasada ? "critical" : "warning",
        title: entrega.colaborador.nome,
        description: `${entrega.epi.nome} · troca ${formatDateOnly(entrega.dataPrevistaTroca)}`,
        badge: atrasada ? `Atrasada ${Math.abs(dias)}d` : dias === 0 ? "Troca hoje" : `Troca em ${dias}d`,
        href: "/entregas?status=EM_USO",
        icon: "troca",
      });
    }

    return items.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
      return a.title.localeCompare(b.title, "pt-BR");
    });
  }, [data.caAlerts, data.estoqueBaixo, data.proximasTrocas]);

  const visibleAlerts = filter === "critical" ? alerts.filter((item) => item.severity === "critical") : alerts;
  const criticos = alerts.filter((item) => item.severity === "critical").length;

  const kpis: Array<{
    label: string;
    value: number;
    hint: string;
    icon: typeof ClipboardCheck;
    tone: KpiTone;
    href: string;
  }> = [
    {
      label: "EPIs entregues no mês",
      value: data.kpis.entregasNoMes,
      hint: `${formatQuantity(data.kpis.itensEmUso)} itens em uso`,
      icon: ClipboardCheck,
      tone: "brand",
      href: "/entregas",
    },
    {
      label: "CAs vencidos",
      value: data.kpis.caVencidos,
      hint: `${formatQuantity(data.kpis.caAVencer)} vencem em até 30 dias`,
      icon: ShieldAlert,
      tone: "danger",
      href: "/epis",
    },
    {
      label: "Estoque crítico",
      value: data.kpis.estoqueCritico,
      hint: "No limite ou abaixo do mínimo",
      icon: PackageX,
      tone: "warning",
      href: "/epis",
    },
    {
      label: "Trocas previstas",
      value: data.kpis.trocasProximas,
      hint: `${formatQuantity(data.kpis.trocasAtrasadas)} atrasadas`,
      icon: CalendarClock,
      tone: "info",
      href: "/entregas?status=EM_USO",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral"
        description={`${formatLongDate(data.hoje)} · validade, estoque e entregas em tempo real.`}
        actions={
          <Link href="/entregas/nova" className={buttonVariants({ size: "lg" })}>
            <Plus className="h-5 w-5" />
            Nova entrega
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="slate">
          <Users className="h-3.5 w-3.5" />
          {formatQuantity(data.kpis.colaboradoresAtivos)} colaboradores ativos
        </Badge>
        <Badge tone="slate">
          <HardHat className="h-3.5 w-3.5" />
          {formatQuantity(data.kpis.episAtivos)} EPIs cadastrados
        </Badge>
        {data.kpis.alertas > 0 ? (
          <Badge tone="amber">
            <AlertTriangle className="h-3.5 w-3.5" />
            {formatQuantity(data.kpis.alertas)} pontos de atenção
          </Badge>
        ) : (
          <Badge tone="emerald">
            <ShieldCheck className="h-3.5 w-3.5" />
            Operação em dia
          </Badge>
        )}
      </div>

      <motion.div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} variants={staggerItem} whileTap={{ scale: 0.985 }}>
              <Link
                href={kpi.href}
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-line bg-surface p-4 text-fg shadow-sm transition hover:border-line-strong hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      kpiTones[kpi.tone],
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-muted" />
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight text-fg md:text-3xl">
                    {formatQuantity(kpi.value)}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-fg-soft">{kpi.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{kpi.hint}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                Alertas rápidos
                {criticos > 0 ? <PulseDot tone="danger" /> : null}
              </span>
            }
            description="Prioridade máxima para CA vencido, estoque zerado e troca atrasada."
            action={
              <div className="flex rounded-xl border border-line bg-surface-muted p-1">
                {(["all", "critical"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    aria-pressed={filter === value}
                    className={cn(
                      "relative min-h-10 rounded-lg px-3 text-xs font-semibold transition active:scale-95",
                      filter === value ? "text-brand-contrast" : "text-muted hover:text-fg",
                    )}
                  >
                    {filter === value ? (
                      <motion.span
                        layoutId="alert-filter"
                        className="absolute inset-0 -z-10 rounded-lg bg-brand"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    {value === "all" ? "Todos" : "Críticos"}
                  </button>
                ))}
              </div>
            }
          />

          {visibleAlerts.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6 text-brand" />}
              title={filter === "critical" ? "Nenhum alerta crítico" : "Nenhum alerta no momento"}
              description={
                filter === "critical"
                  ? "Não há CA vencido, estoque zerado ou troca atrasada."
                  : "Validade, estoque e trocas estão dentro dos parâmetros."
              }
            />
          ) : (
            <motion.ul
              className="max-h-[430px] divide-y divide-line overflow-y-auto overscroll-contain"
              initial="hidden"
              animate="show"
              variants={staggerContainer}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {visibleAlerts.map((alert) => {
                  const Icon = alertIcons[alert.icon];
                  const critical = alert.severity === "critical";
                  return (
                    <motion.li
                      key={alert.id}
                      layout
                      variants={staggerItem}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                    >
                      <Link
                        href={alert.href}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-surface-muted active:scale-[0.995] sm:px-5"
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            critical
                              ? "bg-danger-soft text-danger-strong"
                              : "bg-warning-soft text-warning-strong",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{alert.title}</p>
                          <p className="truncate text-xs text-muted">{alert.description}</p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                            critical
                              ? "border-danger-border bg-danger-soft text-danger-strong"
                              : "border-warning-border bg-warning-soft text-warning-strong",
                          )}
                        >
                          {critical ? <PulseDot tone="danger" /> : null}
                          {alert.badge}
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Validade dos CAs"
              description="Vencidos ou vencendo nos próximos 30 dias."
              action={
                <Link
                  href="/epis"
                  className="inline-flex min-h-12 items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
                >
                  Ver EPIs
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {data.caAlerts.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6 text-brand" />}
                title="Todos os CAs estão em dia"
                description="Nenhum certificado vence nos próximos 30 dias."
              />
            ) : (
              <motion.ul
                className="divide-y divide-line"
                initial="hidden"
                animate="show"
                variants={staggerContainer}
              >
                {data.caAlerts.slice(0, 5).map((epi) => (
                  <motion.li
                    key={epi.id}
                    variants={staggerItem}
                    className="flex min-h-14 items-center gap-3 px-5 py-3"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        daysUntil(epi.dataValidadeCA) < 0
                          ? "bg-danger-soft text-danger-strong"
                          : "bg-warning-soft text-warning-strong",
                      )}
                    >
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{epi.nome}</p>
                      <p className="text-xs text-muted">
                        CA {epi.numeroCA} · até {formatDateOnly(epi.dataValidadeCA)}
                      </p>
                    </div>
                    <CaValidadeBadge dataValidadeCA={epi.dataValidadeCA} />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Trocas previstas"
              description="Entregas em uso com troca atrasada ou nos próximos 15 dias."
            />
            {data.proximasTrocas.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-6 w-6 text-brand" />}
                title="Nenhuma troca próxima"
                description="As próximas trocas estão fora da janela de 15 dias."
              />
            ) : (
              <motion.ul
                className="divide-y divide-line"
                initial="hidden"
                animate="show"
                variants={staggerContainer}
              >
                {data.proximasTrocas.slice(0, 5).map((entrega) => (
                  <motion.li
                    key={entrega.id}
                    variants={staggerItem}
                    className="flex min-h-14 items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {entrega.colaborador.nome}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {entrega.epi.nome} · {formatDateOnly(entrega.dataPrevistaTroca)}
                      </p>
                    </div>
                    <TrocaBadge dataPrevistaTroca={entrega.dataPrevistaTroca} />
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Estoque abaixo do mínimo"
          description="Reposição necessária para não interromper as entregas."
          action={
            <Link
              href="/epis"
              className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
            >
              Repor
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {data.estoqueBaixo.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-6 w-6 text-brand" />}
            title="Estoque saudável"
            description="Todos os EPIs estão acima do estoque mínimo."
          />
        ) : (
          <motion.ul
            className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            {data.estoqueBaixo.map((epi) => (
              <motion.li key={epi.id} variants={staggerItem}>
                <Link
                  href={`/epis?q=${encodeURIComponent(epi.numeroCA)}`}
                  className="flex min-h-24 items-start gap-3 rounded-xl border border-line bg-surface-muted p-3.5 transition hover:border-warning-border hover:bg-warning-soft active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger-strong">
                    <PackageX className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{epi.nome}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Saldo {formatQuantity(epi.quantidadeEstoque)} · mínimo{" "}
                      {formatQuantity(epi.estoqueMinimo)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-warning-strong">
                      Repor agora
                    </p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Últimas entregas"
          description="Registros mais recentes do almoxarifado."
          action={
            <Link
              href="/entregas"
              className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-brand-strong hover:underline"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {data.entregasRecentes.length === 0 ? (
          <EmptyState
            title="Nenhuma entrega registrada"
            description="Quando a primeira entrega digital for feita, ela aparecerá aqui."
            action={
              <Link href="/entregas/nova" className={buttonVariants({ size: "sm" })}>
                Registrar primeira entrega
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-muted/80 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Colaborador</th>
                  <th className="px-5 py-3 font-semibold">EPI</th>
                  <th className="px-5 py-3 font-semibold">Entrega</th>
                  <th className="px-5 py-3 font-semibold">Troca prevista</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-line"
                initial="hidden"
                animate="show"
                variants={staggerContainer}
              >
                {data.entregasRecentes.map((entrega) => (
                  <motion.tr
                    key={entrega.id}
                    variants={staggerItem}
                    className="transition hover:bg-surface-muted/60"
                  >
                    <td className="px-5 py-3 font-medium text-fg">
                      {entrega.colaborador.nome}
                    </td>
                    <td className="px-5 py-3 text-muted">{entrega.epi.nome}</td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateOnly(entrega.dataEntrega)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDateOnly(entrega.dataPrevistaTroca)}
                    </td>
                    <td className="px-5 py-3">
                      <DevolucaoStatusBadge status={entrega.statusDevolucao} />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PulseDot({ tone }: { tone: "danger" | "warning" }) {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      <motion.span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full",
          tone === "danger" ? "bg-danger" : "bg-warning",
        )}
        animate={{ scale: [1, 2.1], opacity: [0.65, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
      />
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 rounded-full",
          tone === "danger" ? "bg-danger" : "bg-warning",
        )}
      />
    </span>
  );
}
