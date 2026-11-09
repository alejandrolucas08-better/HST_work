import type { StatusColaborador, StatusDevolucao } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { LIMITE_ALERTA_CA_DIAS, STATUS_CA_LABELS, type StatusCA } from "@/lib/constants";
import { daysUntil } from "@/lib/format";

export function ColaboradorStatusBadge({ status }: { status: StatusColaborador }) {
  const map = {
    ATIVO: { tone: "emerald" as const, label: "Ativo" },
    INATIVO: { tone: "amber" as const, label: "Inativo" },
    DESLIGADO: { tone: "rose" as const, label: "Desligado" },
  };
  const item = map[status];
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function DevolucaoStatusBadge({ status }: { status: StatusDevolucao }) {
  const map = {
    EM_USO: { tone: "emerald" as const, label: "Em uso" },
    DEVOLVIDO: { tone: "slate" as const, label: "Devolvido" },
    TROCADO: { tone: "sky" as const, label: "Trocado" },
    PERDIDO: { tone: "rose" as const, label: "Perdido" },
  };
  const item = map[status];
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function CaValidadeBadge({ dataValidadeCA }: { dataValidadeCA: Date | string }) {
  const dias = daysUntil(dataValidadeCA);

  if (dias < 0) {
    return <Badge tone="rose">CA vencido há {Math.abs(dias)}d</Badge>;
  }
  if (dias <= LIMITE_ALERTA_CA_DIAS) {
    return (
      <Badge tone="amber">
        {dias === 0 ? "CA vence hoje" : `CA vence em ${dias}d`}
      </Badge>
    );
  }
  return <Badge tone="emerald">CA válido</Badge>;
}

export function EstoqueBadge({
  quantidade,
  minimo,
}: {
  quantidade: number;
  minimo: number;
}) {
  if (quantidade === 0) return <Badge tone="rose">Sem estoque</Badge>;
  if (quantidade <= minimo) return <Badge tone="amber">Estoque baixo</Badge>;
  return <Badge tone="emerald">Disponível</Badge>;
}

export function TrocaBadge({ dataPrevistaTroca }: { dataPrevistaTroca: Date | string }) {
  const dias = daysUntil(dataPrevistaTroca);

  if (dias < 0) return <Badge tone="rose">Troca atrasada {Math.abs(dias)}d</Badge>;
  if (dias === 0) return <Badge tone="amber">Troca hoje</Badge>;
  if (dias <= 15) return <Badge tone="amber">Troca em {dias}d</Badge>;
  return <Badge tone="slate">Em dia</Badge>;
}
