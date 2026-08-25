import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { Plus, Trash2, Pencil, GripVertical } from "lucide-react";
import { useProjects, useTasks, formatDate } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";

import { StatusBadge } from "@/components/StatusBadge";
import { AssigneeBadge } from "@/components/AssigneeBadge";
import { TaskFormDialog } from "@/components/forms/TaskFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tarefas — Giarola Engenharia" }, { name: "description", content: "Kanban de tarefas." }] }),
  component: TasksPage,
});

const columns: TaskStatus[] = ["A fazer", "Em andamento", "Concluído"];

function TasksPage() {
  const { items, update, remove } = useTasks();
  const { items: projects } = useProjects();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useViewMode("tasks", "quadro");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byCol = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { "A fazer": [], "Em andamento": [], "Concluído": [] };
    items.forEach(t => map[t.status].push(t));
    return map;
  }, [items]);

  const projName = (id?: string) => projects.find(p => p.id === id)?.name;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const newStatus = String(overId) as TaskStatus;
    if (!columns.includes(newStatus)) return;
    const task = items.find(t => t.id === e.active.id);
    if (task && task.status !== newStatus) {
      update(task.id, { status: newStatus });
    }
  };

  const activeTask = items.find(t => t.id === activeId) ?? null;

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Organize as próximas atividades no quadro Kanban ou em lista."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} options={["quadro", "lista", "bloco"]} />
            <TaskFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" /> Nova tarefa</Button>} />
          </>
        }
      />

      {view === "quadro" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid gap-4 md:grid-cols-3">
            {columns.map(col => (
              <Column key={col} id={col} title={col} count={byCol[col].length}>
                {byCol[col].map(t => (
                  <TaskCard
                    key={t.id} task={t} projectName={projName(t.projectId)}
                    onDelete={() => { remove(t.id); toast.success("Tarefa excluída."); }}
                  />
                ))}
                {byCol[col].length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Sem tarefas</p>
                )}
              </Column>
            ))}
          </div>
          <DragOverlay>
            {activeTask && <TaskCardView task={activeTask} projectName={projName(activeTask.projectId)} dragging />}
          </DragOverlay>
        </DndContext>
      ) : view === "bloco" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="flex">
                    <TaskFormDialog initial={t} trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>} />
                    <ConfirmDelete
                      trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      title="Excluir tarefa?"
                      onConfirm={() => { remove(t.id); toast.success("Tarefa excluída."); }}
                    />
                  </div>
                </div>
                {projName(t.projectId) && <p className="text-xs text-muted-foreground mt-0.5 truncate">{projName(t.projectId)}</p>}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <StatusBadge value={t.status} />
                  <StatusBadge value={t.priority} />
                  <AssigneeBadge userId={t.assigneeId} />
                  {t.dueDate && <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {items.length === 0 && <p className="text-sm text-muted-foreground p-4">Sem tarefas.</p>}
            {items.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[projName(t.projectId), t.dueDate ? formatDate(t.dueDate) : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <AssigneeBadge userId={t.assigneeId} />
                <StatusBadge value={t.priority} />
                <StatusBadge value={t.status} />
                <div className="flex">
                  <TaskFormDialog initial={t} trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>} />
                  <ConfirmDelete
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    title="Excluir tarefa?"
                    onConfirm={() => { remove(t.id); toast.success("Tarefa excluída."); }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Column({ id, title, count, children }: { id: TaskStatus; title: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={cn("rounded-lg border bg-muted/40 p-3 transition-colors", isOver && "bg-primary/5 border-primary/40")}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground bg-background rounded px-2 py-0.5">{count}</span>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[120px]">{children}</div>
    </div>
  );
}

function TaskCard({ task, projectName, onDelete }: { task: Task; projectName?: string; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <Card className="group">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <button {...attributes} {...listeners} className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing mt-0.5">
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{task.title}</p>
              {projectName && <p className="text-xs text-muted-foreground mt-0.5 truncate">{projectName}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge value={task.priority} />
                <AssigneeBadge userId={task.assigneeId} />
                {task.dueDate && <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>}
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
              <TaskFormDialog initial={task} trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>} />
              <ConfirmDelete
                trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                title="Excluir tarefa?"
                onConfirm={onDelete}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCardView({ task, projectName, dragging }: { task: Task; projectName?: string; dragging?: boolean }) {
  return (
    <Card className={cn("shadow-lg", dragging && "rotate-2")}>
      <CardContent className="p-3">
        <p className="text-sm font-medium">{task.title}</p>
        {projectName && <p className="text-xs text-muted-foreground mt-0.5">{projectName}</p>}
      </CardContent>
    </Card>
  );
}
