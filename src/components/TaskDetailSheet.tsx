import { useEffect, useState } from "react";
import { Plus, Trash2, X, CalendarPlus } from "lucide-react";
import { DatePickerField } from "@/components/DatePickerField";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  useTasks,
  useTaskSections,
  useSubtasks,
  useTaskComments,
  useTaskFields,
  useProjects,
  isTaskDone,
  sortedSections,
  sortedFields,
  formatDateTime,
  googleCalendarLink,
} from "@/lib/storage";
import { useAppAuth } from "@/hooks/useAppAuth";
import { useAppUsers } from "@/hooks/useAppUsers";
import type { TaskPriority } from "@/lib/types";
import { toast } from "sonner";

const priorities: TaskPriority[] = ["Alta", "Média", "Baixa"];

export function TaskDetailSheet({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const { items: tasks, update: updateTask, remove: removeTask } = useTasks();
  const { items: sectionsRaw } = useTaskSections();
  const sections = sortedSections(sectionsRaw);
  const {
    items: allSubtasks,
    add: addSubtask,
    update: updateSubtask,
    remove: removeSubtask,
  } = useSubtasks();
  const { items: allComments, add: addComment } = useTaskComments();
  const { items: fieldsRaw } = useTaskFields();
  const fields = sortedFields(fieldsRaw);
  const { items: projects } = useProjects();
  const { data: users = [] } = useAppUsers();
  const { user: me } = useAppAuth();

  const task = tasks.find((t) => t.id === taskId) ?? null;
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [descDraft, setDescDraft] = useState(task?.description ?? "");

  useEffect(() => setDescDraft(task?.description ?? ""), [task?.id]);

  if (!task) return null;

  const done = isTaskDone(task, sections);
  const doneSection = sections.find((s) => s.isDone) ?? sections[sections.length - 1];
  const todoSection = sections.find((s) => !s.isDone) ?? sections[0];
  const subtasks = allSubtasks
    .filter((s) => s.taskId === task.id)
    .sort((a, b) => a.order - b.order);
  const comments = allComments
    .filter((c) => c.taskId === task.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const subtaskProgress = subtasks.length
    ? Math.round((subtasks.filter((s) => s.completed).length / subtasks.length) * 100)
    : null;

  const submitSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    addSubtask({ taskId: task.id, title, completed: false, order: subtasks.length });
    setNewSubtask("");
  };

  const submitComment = () => {
    const body = newComment.trim();
    if (!body) return;
    addComment({
      taskId: task.id,
      authorId: me?.id,
      authorName: me?.name || me?.email || "Você",
      body,
      createdAt: new Date().toISOString(),
    });
    setNewComment("");
  };

  return (
    <Sheet open={!!taskId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Detalhes da tarefa</SheetTitle>
          <div className="flex items-start gap-3">
            <Checkbox
              className="mt-2"
              checked={done}
              onCheckedChange={(c) =>
                updateTask(task.id, { sectionId: c ? doneSection.id : todoSection.id })
              }
            />
            <Input
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
              className={`text-lg font-semibold border-none px-0 shadow-none focus-visible:ring-0 ${done ? "line-through text-muted-foreground" : ""}`}
            />
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-2">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Descrição
            </Label>
            <Textarea
              rows={3}
              placeholder="Adicionar descrição..."
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={() => updateTask(task.id, { description: descDraft || undefined })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <F label="Seção">
              <Select
                value={task.sectionId}
                onValueChange={(v) => updateTask(task.id, { sectionId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Prioridade">
              <Select
                value={task.priority}
                onValueChange={(v) => updateTask(task.id, { priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Responsável">
              <Select
                value={task.assigneeId ?? "none"}
                onValueChange={(v) =>
                  updateTask(task.id, { assigneeId: v === "none" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
            <F label="Prazo">
              <div className="flex items-center gap-1.5">
                <DatePickerField
                  value={task.dueDate}
                  onChange={(v) => updateTask(task.id, { dueDate: v })}
                  className="flex-1"
                />
                {task.dueDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Adicionar ao Google Agenda"
                    asChild
                  >
                    <a
                      href={googleCalendarLink(task.title, task.dueDate, task.description)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </F>
            <div className="col-span-2">
              <F label="Projeto">
                <Select
                  value={task.projectId ?? "none"}
                  onValueChange={(v) =>
                    updateTask(task.id, { projectId: v === "none" ? undefined : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem projeto</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </F>
            </div>
          </div>

          {fields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <F key={f.id} label={f.name}>
                  {f.type === "select" ? (
                    <Select
                      value={String(task.customFields?.[f.id] ?? "none")}
                      onValueChange={(v) =>
                        updateTask(task.id, {
                          customFields: { ...task.customFields, [f.id]: v === "none" ? "" : v },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      value={task.customFields?.[f.id] ?? ""}
                      onChange={(e) =>
                        updateTask(task.id, {
                          customFields: {
                            ...task.customFields,
                            [f.id]: f.type === "number" ? Number(e.target.value) : e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </F>
              ))}
            </div>
          )}

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Subtarefas{subtaskProgress != null ? ` · ${subtaskProgress}%` : ""}
              </Label>
            </div>
            <div className="space-y-1.5">
              {subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2">
                  <Checkbox
                    checked={s.completed}
                    onCheckedChange={(c) => updateSubtask(s.id, { completed: !!c })}
                  />
                  <span
                    className={`flex-1 text-sm ${s.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {s.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => removeSubtask(s.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Adicionar subtarefa..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSubtask()}
                className="h-8"
              />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={submitSubtask}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Comentários
            </Label>
            <div className="space-y-3 mt-2">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="text-sm rounded-md bg-secondary/60 p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-xs">{c.authorName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-2">
              <Textarea
                placeholder="Escrever um comentário..."
                rows={2}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={submitComment}
              disabled={!newComment.trim()}
            >
              Comentar
            </Button>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <ConfirmDelete
            trigger={
              <Button variant="outline" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir tarefa
              </Button>
            }
            title="Excluir tarefa?"
            onConfirm={() => {
              removeTask(task.id);
              toast.success("Tarefa excluída.");
              onClose();
            }}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
