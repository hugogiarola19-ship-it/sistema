import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderKanban, Users, CalendarClock, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  useProjects,
  useClients,
  useTasks,
  useTaskSections,
  useTransactions,
  projectProgress,
  isTaskDone,
  formatBRL,
  formatDate,
} from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Giarola Engenharia" },
      {
        name: "description",
        content: "Visão geral dos projetos, tarefas e finanças do escritório.",
      },
    ],
  }),
  component: Dashboard,
});

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p className="text-2xl font-semibold mt-1 truncate">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>}
          </div>
          <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { items: projects } = useProjects();
  const { items: clients } = useClients();
  const { items: tasks, update: updateTask } = useTasks();
  const { items: sections } = useTaskSections();
  const { items: txs } = useTransactions();
  const doneSection = sections.find((s) => s.isDone) ?? sections[sections.length - 1];
  const todoSection = sections.find((s) => !s.isDone) ?? sections[0];

  const active = projects.filter(
    (p) => p.status === "Em andamento" || p.status === "Aguardando cliente",
  );
  const upcoming = active.filter((p) => {
    const d = new Date(p.deadline).getTime();
    return d - Date.now() < 14 * 86400000;
  }).length;

  const now = new Date();
  const monthTx = txs.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const received = monthTx
    .filter((t) => t.type === "Receita" && t.status === "Pago")
    .reduce((s, t) => s + t.value, 0);
  const expected = monthTx.filter((t) => t.type === "Receita").reduce((s, t) => s + t.value, 0);
  const pending = expected - received;
  const expenses = monthTx
    .filter((t) => t.type === "Despesa" && t.status === "Pago")
    .reduce((s, t) => s + t.value, 0);
  const investments = monthTx
    .filter((t) => t.type === "Investimento" && t.status === "Pago")
    .reduce((s, t) => s + t.value, 0);
  const proLabore = monthTx
    .filter((t) => t.type === "Pró-labore" && t.status === "Pago")
    .reduce((s, t) => s + t.value, 0);
  const result = received - expenses - investments - proLabore;

  const activeClients = useMemo(() => {
    const ids = new Set(active.map((p) => p.clientId));
    return clients.filter((c) => ids.has(c.id)).length;
  }, [active, clients]);

  const weeklyTasks = tasks.filter((t) => t.weekly);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title="Bom dia, Engenheiro" description="Resumo de hoje no escritório." />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Metric
          icon={FolderKanban}
          label="Projetos ativos"
          value={String(active.length)}
          hint={`${projects.length} no total`}
        />
        <Metric
          icon={CalendarClock}
          label="Prazos próximos"
          value={String(upcoming)}
          hint="Próximos 14 dias"
        />
        <Metric
          icon={TrendingUp}
          label="Receita do mês"
          value={formatBRL(received)}
          hint={`Previsto ${formatBRL(expected)}`}
        />
        <Metric
          icon={Users}
          label="Clientes ativos"
          value={String(activeClients)}
          hint={`${clients.length} cadastrados`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-2 min-w-0">
            <CardTitle className="text-base truncate min-w-0">Projetos em andamento</CardTitle>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/projects">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 min-w-0">
            {active.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="Nenhum projeto ativo"
                action={
                  <Button asChild>
                    <Link to="/projects">Criar primeiro projeto</Link>
                  </Button>
                }
              />
            ) : (
              active.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$id"
                  params={{ id: p.id }}
                  className="block min-w-0 rounded-lg border p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {clientName(p.clientId)} · prazo {formatDate(p.deadline)}
                      </p>
                    </div>
                    <StatusBadge value={p.status} className="self-start shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center gap-3 min-w-0">
                    <Progress
                      value={projectProgress(tasks, sections, p.id)}
                      className="h-2 flex-1 min-w-0"
                    />
                    <span className="text-xs font-medium tabular-nums w-9 shrink-0 text-right">
                      {projectProgress(tasks, sections, p.id)}%
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 min-w-0">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm min-w-0">
              <Row label="Receita prevista" value={formatBRL(expected)} />
              <Row label="Recebido" value={formatBRL(received)} accent="success" />
              <Row label="A receber" value={formatBRL(pending)} accent="warning" />
              <Row label="Despesas" value={formatBRL(expenses)} accent="destructive" />
              <Row label="Investimentos" value={formatBRL(investments)} accent="destructive" />
              <Row label="Pró-labore" value={formatBRL(proLabore)} accent="destructive" />
              <div className="border-t pt-2 mt-2">
                <Row label="Resultado" value={formatBRL(result)} bold />
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 min-w-0">
              <CardTitle className="text-base truncate min-w-0">Tarefas da semana</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="space-y-2 min-w-0">
              {weeklyTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem tarefas marcadas.</p>
              )}
              {weeklyTasks.map((t) => {
                const done = isTaskDone(t, sections);
                return (
                  <label
                    key={t.id}
                    className="flex items-start gap-3 text-sm cursor-pointer min-w-0"
                  >
                    <Checkbox
                      checked={done}
                      onCheckedChange={(c) =>
                        updateTask(t.id, { sectionId: c ? doneSection.id : todoSection.id })
                      }
                      className="mt-0.5 shrink-0"
                    />
                    <span
                      className={`min-w-0 break-words ${done ? "line-through text-muted-foreground" : ""}`}
                    >
                      {t.title}
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: "success" | "warning" | "destructive";
}) {
  const c =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-warning-foreground"
        : accent === "destructive"
          ? "text-destructive"
          : "";
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-muted-foreground truncate min-w-0">{label}</span>
      <span
        className={`tabular-nums shrink-0 whitespace-nowrap ${bold ? "font-semibold" : ""} ${c}`}
      >
        {value}
      </span>
    </div>
  );
}
