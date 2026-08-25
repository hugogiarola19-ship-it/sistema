import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderKanban, Plus, Trash2, Pencil } from "lucide-react";
import { useClients, useProjects, useTasks, projectProgress, formatBRL, formatDate } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { ProjectFormDialog } from "@/components/forms/ProjectFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { ProjectStatus, ProjectType } from "@/lib/types";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projetos — Giarola Engenharia" }, { name: "description", content: "Gestão de projetos do escritório." }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { items, remove } = useProjects();
  const { items: clients } = useClients();
  const { items: tasks } = useTasks();
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [type, setType] = useState<ProjectType | "all">("all");
  const [view, setView] = useViewMode("projects", "lista");

  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? "—";

  const filtered = useMemo(() =>
    items.filter(p => (status === "all" || p.status === status) && (type === "all" || p.type === type)),
    [items, status, type]);

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Acompanhe cálculos, laudos e consultorias."
        actions={
          <ProjectFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" /> Novo projeto</Button>} />
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={status} onValueChange={v => setStatus(v as any)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(["Em andamento", "Aguardando cliente", "Entregue", "Arquivado"] as ProjectStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={v => setType(v as any)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(["Unifamiliar", "Multifamiliar", "Comercial"] as ProjectType[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto"><ViewToggle value={view} onChange={setView} /></div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto encontrado"
          description="Ajuste os filtros ou crie um novo projeto."
          action={<ProjectFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" /> Criar primeiro projeto</Button>} />}
        />
      ) : (
        <div className={view === "bloco" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className={view === "bloco" ? "flex flex-col gap-3" : "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"}>
                  <div className="min-w-0 flex-1">
                    <Link to="/projects/$id" params={{ id: p.id }} className="font-medium hover:text-primary block truncate">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>{clientName(p.clientId)}</span>
                      <span>·</span>
                      <span>{p.type}</span>
                      <span>·</span>
                      <span>Prazo {formatDate(p.deadline)}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">{formatBRL(p.value)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={p.status} />
                    <ProjectFormDialog initial={p} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                    <ConfirmDelete
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      title="Excluir projeto?"
                      description={`O projeto "${p.name}" será removido.`}
                      onConfirm={() => { remove(p.id); toast.success("Projeto excluído."); }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={projectProgress(tasks, p.id)} className="h-2 flex-1" />
                  <span className="text-xs font-medium tabular-nums w-9 text-right">{projectProgress(tasks, p.id)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
