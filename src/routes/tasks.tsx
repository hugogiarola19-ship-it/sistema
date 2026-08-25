import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus, Trash2, GripVertical, MoreHorizontal, ListChecks, CheckCircle2 } from "lucide-react";
import {
  useProjects,
  useTasks,
  useTaskSections,
  useSubtasks,
  sortedSections,
  isTaskDone,
  formatDate,
} from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { StatusBadge } from "@/components/StatusBadge";
import { AssigneeBadge } from "@/components/AssigneeBadge";
import { TaskFormDialog } from "@/components/forms/TaskFormDialog";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tarefas — Giarola Engenharia" },
      { name: "description", content: "Quadro de tarefas com seções personalizáveis." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { items: tasks, update, remove } = useTasks();
  const { items: projects } = useProjects();
  const {
    items: sectionsRaw,
    add: addSection,
    update: updateSection,
    remove: removeSection,
  } = useTaskSections();
  const { items: subtasks } = useSubtasks();
  const sections = sortedSections(sectionsRaw);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [view, setView] = useViewMode("tasks", "quadro");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byCol = useMemo(() => {
    const map: Record<string, Task[]> = {};
    sections.forEach((s) => {
      map[s.id] = [];
    });
    tasks.forEach((t) => {
      (map[t.sectionId] ??= []).push(t);
    });
    return map;
  }, [tasks, sections]);

  const subtaskCount = (taskId: string) => {
    const own = subtasks.filter((s) => s.taskId === taskId);
    return own.length ? { total: own.length, done: own.filter((s) => s.completed).length } : null;
  };

  const projName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name ?? "—";

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const newSectionId = String(overId);
    if (!sections.some((s) => s.id === newSectionId)) return;
    const task = tasks.find((t) => t.id === e.active.id);
    if (task && task.sectionId !== newSectionId) {
      update(task.id, { sectionId: newSectionId });
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId) ?? null;

  const addNewSection = () => {
    const order = sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 0;
    addSection({ name: "Nova seção", order, isDone: false });
  };

  const deleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error("É preciso manter ao menos uma seção.");
      return;
    }
    const fallback = sections.find((s) => s.id !== sectionId);
    if (fallback)
      tasks
        .filter((t) => t.sectionId === sectionId)
        .forEach((t) => update(t.id, { sectionId: fallback.id }));
    removeSection(sectionId);
    toast.success("Seção excluída.");
  };

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Organize as próximas atividades no quadro Kanban ou em lista. Crie suas próprias seções, como no Asana."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} options={["quadro", "lista", "bloco"]} />
            <TaskFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Nova tarefa
                </Button>
              }
            />
          </>
        }
      />

      {view === "quadro" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sections.map((sec) => (
              <div key={sec.id} className="w-72 shrink-0">
                <Column
                  section={sec}
                  count={(byCol[sec.id] ?? []).length}
                  onRename={(name) => updateSection(sec.id, { name })}
                  onToggleDone={() => updateSection(sec.id, { isDone: !sec.isDone })}
                  onDelete={() => deleteSection(sec.id)}
                >
                  {(byCol[sec.id] ?? []).map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectName={projName(t.projectId)}
                      subtasks={subtaskCount(t.id)}
                      onOpen={() => setOpenTaskId(t.id)}
                      onDelete={() => {
                        remove(t.id);
                        toast.success("Tarefa excluída.");
                      }}
                    />
                  ))}
                  {(byCol[sec.id] ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Sem tarefas</p>
                  )}
                </Column>
              </div>
            ))}
            <div className="w-56 shrink-0">
              <Button variant="outline" className="w-full border-dashed" onClick={addNewSection}>
                <Plus className="h-4 w-4 mr-1" /> Nova seção
              </Button>
            </div>
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCardView
                task={activeTask}
                projectName={projName(activeTask.projectId)}
                dragging
              />
            )}
          </DragOverlay>
        </DndContext>
      ) : view === "bloco" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => {
            const st = subtaskCount(t.id);
            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setOpenTaskId(t.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isTaskDone(t, sections) && "line-through text-muted-foreground",
                      )}
                    >
                      {t.title}
                    </p>
                    <ConfirmDelete
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 -mt-1 -mr-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      }
                      title="Excluir tarefa?"
                      onConfirm={() => {
                        remove(t.id);
                        toast.success("Tarefa excluída.");
                      }}
                    />
                  </div>
                  {projName(t.projectId) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {projName(t.projectId)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-[11px] text-muted-foreground bg-secondary rounded px-2 py-0.5">
                      {sectionName(t.sectionId)}
                    </span>
                    <StatusBadge value={t.priority} />
                    <AssigneeBadge userId={t.assigneeId} />
                    {t.dueDate && (
                      <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
                    )}
                    {st && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ListChecks className="h-3 w-3" />
                        {st.done}/{st.total}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground p-4">Sem tarefas.</p>
            )}
            {tasks.map((t) => {
              const st = subtaskCount(t.id);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/40"
                  onClick={() => setOpenTaskId(t.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isTaskDone(t, sections) && "line-through text-muted-foreground",
                      )}
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {[
                        projName(t.projectId),
                        sectionName(t.sectionId),
                        t.dueDate ? formatDate(t.dueDate) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {st && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <ListChecks className="h-3 w-3" />
                      {st.done}/{st.total}
                    </span>
                  )}
                  <AssigneeBadge userId={t.assigneeId} />
                  <StatusBadge value={t.priority} />
                  <ConfirmDelete
                    trigger={
                      <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                    title="Excluir tarefa?"
                    onConfirm={() => {
                      remove(t.id);
                      toast.success("Tarefa excluída.");
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

function Column({
  section,
  count,
  children,
  onRename,
  onToggleDone,
  onDelete,
}: {
  section: { id: string; name: string; isDone: boolean };
  count: number;
  children: React.ReactNode;
  onRename: (name: string) => void;
  onToggleDone: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);

  const commit = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== section.name) onRename(name);
    else setDraft(section.name);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 p-3 transition-colors h-full",
        isOver && "bg-primary/5 border-primary/40",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1 gap-2">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(section.name);
                setEditing(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <button className="flex items-center gap-1.5 min-w-0" onClick={() => setEditing(true)}>
            <h3 className="text-sm font-medium truncate">{section.name}</h3>
            {section.isDone && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
          </button>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground bg-background rounded px-2 py-0.5">
            {count}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>Renomear</DropdownMenuItem>
              <DropdownMenuCheckboxItem checked={section.isDone} onCheckedChange={onToggleDone}>
                Seção de conclusão
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                Excluir seção
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[120px]">
        {children}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  projectName,
  subtasks,
  onOpen,
  onDelete,
}: {
  task: Task;
  projectName?: string;
  subtasks: { total: number; done: number } | null;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-30")}>
      <Card className="group">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing mt-0.5"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
              <p className="text-sm font-medium">{task.title}</p>
              {projectName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{projectName}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge value={task.priority} />
                <AssigneeBadge userId={task.assigneeId} />
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>
                )}
                {subtasks && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ListChecks className="h-3 w-3" />
                    {subtasks.done}/{subtasks.total}
                  </span>
                )}
              </div>
            </button>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ConfirmDelete
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                }
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

function TaskCardView({
  task,
  projectName,
  dragging,
}: {
  task: Task;
  projectName?: string;
  dragging?: boolean;
}) {
  return (
    <Card className={cn("shadow-lg", dragging && "rotate-2")}>
      <CardContent className="p-3">
        <p className="text-sm font-medium">{task.title}</p>
        {projectName && <p className="text-xs text-muted-foreground mt-0.5">{projectName}</p>}
      </CardContent>
    </Card>
  );
}
