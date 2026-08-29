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
import {
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal,
  ListChecks,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Search,
} from "lucide-react";
import {
  useProjects,
  useTasks,
  useTaskSections,
  useSubtasks,
  useTaskFields,
  sortedSections,
  sortedFields,
  isTaskDone,
  formatDate,
} from "@/lib/storage";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppUsers, type AppUserRow } from "@/hooks/useAppUsers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { TaskFormDialog } from "@/components/forms/TaskFormDialog";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { ManageFieldsDialog } from "@/components/ManageFieldsDialog";
import { DatePickerField } from "@/components/DatePickerField";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Task, TaskPriority, Subtask, TaskFieldDef } from "@/lib/types";
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

const PRIORITY_RANK: Record<TaskPriority, number> = { Alta: 0, Média: 1, Baixa: 2 };
type SortBy = "prazo" | "prioridade" | "titulo";
type GroupBy = "secao" | "responsavel" | "nenhum";

function TasksPage() {
  const { items: tasks, update, remove } = useTasks();
  const { items: projects } = useProjects();
  const { data: users = [] } = useAppUsers();
  const {
    items: sectionsRaw,
    add: addSection,
    update: updateSection,
    remove: removeSection,
  } = useTaskSections();
  const { items: subtasks, update: updateSubtask } = useSubtasks();
  const { items: fieldsRaw } = useTaskFields();
  const fields = sortedFields(fieldsRaw);
  const sections = sortedSections(sectionsRaw);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [view, setView] = useViewMode("tasks", "quadro");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("prazo");
  const [groupBy, setGroupBy] = useState<GroupBy>("secao");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (assigneeFilter !== "all" && (t.assigneeId ?? "none") !== assigneeFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (projectFilter !== "all" && (t.projectId ?? "none") !== projectFilter) return false;
      return true;
    });
  }, [tasks, search, assigneeFilter, priorityFilter, projectFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortBy === "prioridade") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sortBy === "titulo") return a.title.localeCompare(b.title);
      return (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99");
    });
    return arr;
  }, [filtered, sortBy]);

  const byCol = useMemo(() => {
    const map: Record<string, Task[]> = {};
    sections.forEach((s) => {
      map[s.id] = [];
    });
    sorted.forEach((t) => {
      (map[t.sectionId] ??= []).push(t);
    });
    return map;
  }, [sorted, sections]);

  const subtasksFor = (taskId: string) => subtasks.filter((s) => s.taskId === taskId);

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

  const groups: Array<{ key: string; label: string; tasks: Task[] }> = useMemo(() => {
    if (groupBy === "nenhum") return [{ key: "all", label: "Todas", tasks: sorted }];
    if (groupBy === "responsavel") {
      const withNone = [
        ...users.map((u) => ({ id: u.id, label: u.name || u.email })),
        { id: "none", label: "Sem responsável" },
      ];
      return withNone
        .map((u) => ({
          key: u.id,
          label: u.label,
          tasks: sorted.filter((t) => (t.assigneeId ?? "none") === u.id),
        }))
        .filter((g) => g.tasks.length > 0);
    }
    return sections
      .map((s) => ({ key: s.id, label: s.name, tasks: sorted.filter((t) => t.sectionId === s.id) }))
      .filter((g) => g.tasks.length > 0);
  }, [groupBy, sorted, sections, users]);

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Organize as próximas atividades no quadro Kanban ou em lista. Crie suas próprias seções, como no Asana."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} options={["quadro", "lista", "bloco"]} />
            <ManageFieldsDialog />
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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-48"
          />
        </div>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            <SelectItem value="none">Sem responsável</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter(v as TaskPriority | "all")}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            <SelectItem value="none">Sem projeto</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prazo">Ordenar: Prazo</SelectItem>
            <SelectItem value="prioridade">Ordenar: Prioridade</SelectItem>
            <SelectItem value="titulo">Ordenar: Título</SelectItem>
          </SelectContent>
        </Select>
        {view === "lista" && (
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="secao">Agrupar: Seção</SelectItem>
              <SelectItem value="responsavel">Agrupar: Responsável</SelectItem>
              <SelectItem value="nenhum">Sem agrupamento</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

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
                      users={users}
                      subtasks={subtasksFor(t.id)}
                      onUpdate={(patch) => update(t.id, patch)}
                      onToggleSubtask={(id, completed) => updateSubtask(id, { completed })}
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
          {sorted.map((t) => (
            <TaskBlockCard
              key={t.id}
              task={t}
              projectName={projName(t.projectId)}
              sectionName={sectionName(t.sectionId)}
              done={isTaskDone(t, sections)}
              users={users}
              subtasks={subtasksFor(t.id)}
              onUpdate={(patch) => update(t.id, patch)}
              onToggleSubtask={(id, completed) => updateSubtask(id, { completed })}
              onOpen={() => setOpenTaskId(t.id)}
              onDelete={() => {
                remove(t.id);
                toast.success("Tarefa excluída.");
              }}
            />
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
          )}
          {groups.map((g) => (
            <div key={g.key}>
              {groupBy !== "nenhum" && (
                <h3 className="text-xs uppercase tracking-wide font-medium text-muted-foreground mb-2">
                  {g.label} <span className="text-muted-foreground/70">({g.tasks.length})</span>
                </h3>
              )}
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarefa</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Responsável</TableHead>
                      {fields.map((f) => (
                        <TableHead key={f.id}>{f.name}</TableHead>
                      ))}
                      <TableHead className="w-9" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.tasks.map((t) => {
                      return (
                        <TableRow key={t.id}>
                          <TableCell>
                            <button
                              className="text-left"
                              onClick={() => setOpenTaskId(t.id)}
                              title="Abrir detalhes da tarefa"
                            >
                              <p
                                className={cn(
                                  "text-sm font-medium hover:text-primary",
                                  isTaskDone(t, sections) && "line-through text-muted-foreground",
                                )}
                              >
                                {t.title}
                              </p>
                            </button>
                            <SubtasksInline
                              subtasks={subtasksFor(t.id)}
                              onToggle={(id, completed) => updateSubtask(id, { completed })}
                            />
                          </TableCell>
                          <TableCell>
                            <ProjectInlineSelect
                              task={t}
                              projects={projects}
                              onUpdate={(patch) => update(t.id, patch)}
                            />
                          </TableCell>
                          <TableCell>
                            <DatePickerField
                              value={t.dueDate}
                              onChange={(v) => update(t.id, { dueDate: v })}
                              placeholder="Prazo"
                              className={cn(tableCellEditClass, "[&_svg]:mr-1.5")}
                            />
                          </TableCell>
                          <TableCell>
                            <PriorityInlineSelect
                              task={t}
                              users={users}
                              onUpdate={(patch) => update(t.id, patch)}
                            />
                          </TableCell>
                          <TableCell>
                            <AssigneeInlineSelect
                              task={t}
                              users={users}
                              onUpdate={(patch) => update(t.id, patch)}
                            />
                          </TableCell>
                          {fields.map((f) => (
                            <TableCell key={f.id}>
                              <CustomFieldInline
                                field={f}
                                value={t.customFields?.[f.id]}
                                onChange={(v) =>
                                  update(t.id, { customFields: { ...t.customFields, [f.id]: v } })
                                }
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <ConfirmDelete
                              trigger={
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              }
                              title="Excluir tarefa?"
                              onConfirm={() => {
                                remove(t.id);
                                toast.success("Tarefa excluída.");
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ))}
        </div>
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

type QuickEditProps = {
  task: Task;
  users: AppUserRow[];
  onUpdate: (patch: Partial<Task>) => void;
};

const priorities: TaskPriority[] = ["Alta", "Média", "Baixa"];
const inlinePillClass =
  "h-6 w-auto gap-1 rounded-full border-none bg-secondary px-2 py-0 text-[11px] shadow-none focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40";
const tableCellEditClass =
  "h-8 w-full max-w-[170px] justify-start truncate border-none bg-transparent px-1.5 shadow-none hover:bg-muted/60 focus:bg-muted/60 focus:ring-1 rounded-md text-sm [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-50";

function ProjectInlineSelect({
  task,
  projects,
  onUpdate,
}: {
  task: Task;
  projects: { id: string; name: string }[];
  onUpdate: (patch: Partial<Task>) => void;
}) {
  return (
    <Select
      value={task.projectId ?? "none"}
      onValueChange={(v) => onUpdate({ projectId: v === "none" ? undefined : v })}
    >
      <SelectTrigger className={tableCellEditClass} onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Projeto" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="none">Sem projeto</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CustomFieldInline({
  field,
  value,
  onChange,
}: {
  field: TaskFieldDef;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  if (field.type === "select") {
    return (
      <Select
        value={value != null && value !== "" ? String(value) : "none"}
        onValueChange={(v) => onChange(v === "none" ? "" : v)}
      >
        <SelectTrigger className={tableCellEditClass} onClick={(e) => e.stopPropagation()}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent onClick={(e) => e.stopPropagation()}>
          <SelectItem value="none">—</SelectItem>
          {(field.options ?? []).map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={field.type === "number" ? "number" : "text"}
      value={value ?? ""}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
      className={tableCellEditClass}
    />
  );
}

function PriorityInlineSelect({ task, onUpdate }: QuickEditProps) {
  return (
    <Select value={task.priority} onValueChange={(v) => onUpdate({ priority: v as TaskPriority })}>
      <SelectTrigger className={inlinePillClass} onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {priorities.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssigneeInlineSelect({ task, users, onUpdate }: QuickEditProps) {
  return (
    <Select
      value={task.assigneeId ?? "none"}
      onValueChange={(v) => onUpdate({ assigneeId: v === "none" ? undefined : v })}
    >
      <SelectTrigger className={inlinePillClass} onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Responsável" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        <SelectItem value="none">Sem responsável</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name || u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DueDateInline({ task, onUpdate }: QuickEditProps) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DatePickerField
        value={task.dueDate}
        onChange={(v) => onUpdate({ dueDate: v })}
        placeholder="Prazo"
        className={cn(inlinePillClass, "h-6 px-2 [&_svg]:mr-1")}
      />
    </div>
  );
}

function SubtasksInline({
  subtasks,
  onToggle,
}: {
  subtasks: Subtask[];
  onToggle: (id: string, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.completed).length;
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-2"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <ListChecks className="h-3 w-3" />
        {done}/{subtasks.length} subtarefas
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1 border-t pt-1.5">
          {subtasks.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={s.completed}
                onCheckedChange={(c) => onToggle(s.id, !!c)}
                className="h-3.5 w-3.5"
              />
              <span className={cn(s.completed && "line-through text-muted-foreground")}>
                {s.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  projectName,
  users,
  subtasks,
  onUpdate,
  onToggleSubtask,
  onOpen,
  onDelete,
}: {
  task: Task;
  projectName?: string;
  users: AppUserRow[];
  subtasks: Subtask[];
  onUpdate: (patch: Partial<Task>) => void;
  onToggleSubtask: (id: string, completed: boolean) => void;
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
            <div className="flex-1 min-w-0">
              <button className="text-left w-full" onClick={onOpen}>
                <p className="text-sm font-medium">{task.title}</p>
                {projectName && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{projectName}</p>
                )}
              </button>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <PriorityInlineSelect task={task} users={users} onUpdate={onUpdate} />
                <AssigneeInlineSelect task={task} users={users} onUpdate={onUpdate} />
                <DueDateInline task={task} users={users} onUpdate={onUpdate} />
              </div>
              <SubtasksInline subtasks={subtasks} onToggle={onToggleSubtask} />
            </div>
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

function TaskBlockCard({
  task,
  projectName,
  sectionName,
  done,
  users,
  subtasks,
  onUpdate,
  onToggleSubtask,
  onOpen,
  onDelete,
}: {
  task: Task;
  projectName?: string;
  sectionName: string;
  done: boolean;
  users: AppUserRow[];
  subtasks: Subtask[];
  onUpdate: (patch: Partial<Task>) => void;
  onToggleSubtask: (id: string, completed: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button className="text-left" onClick={onOpen}>
            <p className={cn("text-sm font-medium", done && "line-through text-muted-foreground")}>
              {task.title}
            </p>
            {projectName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{projectName}</p>
            )}
          </button>
          <ConfirmDelete
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            }
            title="Excluir tarefa?"
            onConfirm={onDelete}
          />
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            {sectionName}
          </span>
          <PriorityInlineSelect task={task} users={users} onUpdate={onUpdate} />
          <AssigneeInlineSelect task={task} users={users} onUpdate={onUpdate} />
          <DueDateInline task={task} users={users} onUpdate={onUpdate} />
        </div>
        <SubtasksInline subtasks={subtasks} onToggle={onToggleSubtask} />
      </CardContent>
    </Card>
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
