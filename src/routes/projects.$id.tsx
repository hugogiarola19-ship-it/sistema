import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { useClients, useProjects, useTasks, useTransactions, projectProgress, formatBRL, formatDate } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { ProjectFormDialog } from "@/components/forms/ProjectFormDialog";
import { TaskFormDialog } from "@/components/forms/TaskFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectDocuments } from "@/components/ProjectDocuments";

export const Route = createFileRoute("/projects/$id")({
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { items: projects, remove } = useProjects();
  const { items: clients } = useClients();
  const { items: tasks, update: updateTask, remove: removeTask } = useTasks();
  const { items: transactions } = useTransactions();
  const project = projects.find(p => p.id === id);

  if (!project) {
    return (
      <div className="max-w-xl">
        <Button variant="ghost" asChild><Link to="/projects"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <p className="mt-6 text-muted-foreground">Projeto não encontrado.</p>
      </div>
    );
  }

  const client = clients.find(c => c.id === project.clientId);
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const progress = projectProgress(tasks, project.id);
  const installments = transactions
    .filter(t => t.projectId === project.id && t.installment != null)
    .sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0));

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2"><Link to="/projects"><ArrowLeft className="h-4 w-4 mr-1" /> Projetos</Link></Button>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <StatusBadge value={project.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{project.type} · Cliente: {client?.name ?? "—"}</p>
        </div>
        <div className="flex gap-2">
          <ProjectFormDialog initial={project} trigger={<Button variant="outline"><Pencil className="h-4 w-4 mr-1" /> Editar</Button>} />
          <ConfirmDelete
            trigger={<Button variant="outline"><Trash2 className="h-4 w-4 mr-1 text-destructive" /> Excluir</Button>}
            onConfirm={() => { remove(project.id); toast.success("Projeto excluído."); navigate({ to: "/projects" }); }}
          />
        </div>
      </div>

      <Tabs defaultValue="visao">
        <TabsList className="mb-4">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <ProjectDocuments projectId={project.id} />
        </TabsContent>

        <TabsContent value="visao">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          <Card>
            <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info label="Valor do contrato" value={formatBRL(project.value)} />
              <Info label="Progresso" value={`${progress}%`} />
              <Info label="Início" value={formatDate(project.startDate)} />
              <Info label="Prazo" value={formatDate(project.deadline)} />
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{project.notes || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tarefas</CardTitle>
              <TaskFormDialog trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Nova tarefa</Button>} defaultProjectId={project.id} />
            </CardHeader>
            <CardContent className="space-y-2">
              {projectTasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>}
              {projectTasks.map(t => {
                const done = t.status === "Concluído";
                return (
                  <div key={t.id} className="flex items-center gap-3 text-sm border rounded-md p-2.5">
                    <Checkbox checked={done} onCheckedChange={c => updateTask(t.id, { status: c ? "Concluído" : "A fazer" })} />
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Prazo {formatDate(t.dueDate)} · {t.status}</p>
                    </div>
                    <StatusBadge value={t.priority} />
                    <TaskFormDialog initial={t} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                    <ConfirmDelete
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      title="Excluir tarefa?"
                      onConfirm={() => { removeTask(t.id); toast.success("Tarefa excluída."); }}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parcelas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {installments.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma parcela cadastrada. Edite o projeto para gerar o parcelamento.</p>}
              {installments.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 text-sm border rounded-md p-2.5">
                  <span>{t.installment}ª parcela · venc. {formatDate(t.date)}</span>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={t.status} />
                    <span className="font-medium tabular-nums">{formatBRL(t.value)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client ? (
              <>
                <Link to="/clients/$id" params={{ id: client.id }} className="font-medium hover:text-primary">{client.name}</Link>
                <p className="text-muted-foreground">{client.type} · {client.city}</p>
                {client.phone && <p>{client.phone}</p>}
                {client.email && <p className="text-muted-foreground break-all">{client.email}</p>}
              </>
            ) : <p className="text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
