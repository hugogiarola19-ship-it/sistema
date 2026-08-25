import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import {
  useTasks,
  useTaskSections,
  useProjects,
  sortedSections,
  isTaskDone,
  formatDate,
} from "@/lib/storage";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/my-tasks")({
  head: () => ({
    meta: [
      { title: "Minhas tarefas — Giarola Engenharia" },
      { name: "description", content: "Tarefas atribuídas a você, organizadas por prazo." },
    ],
  }),
  component: MyTasksPage,
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function MyTasksPage() {
  const { user } = useAppAuth();
  const { items: tasks, update } = useTasks();
  const { items: sectionsRaw } = useTaskSections();
  const sections = sortedSections(sectionsRaw);
  const { items: projects } = useProjects();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const doneSection = sections.find((s) => s.isDone) ?? sections[sections.length - 1];
  const todoSection = sections.find((s) => !s.isDone) ?? sections[0];

  const mine = useMemo(() => tasks.filter((t) => user && t.assigneeId === user.id), [tasks, user]);
  const projName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const today = startOfToday();

  const groups = useMemo(() => {
    const pending = mine.filter((t) => !isTaskDone(t, sections));
    const done = mine.filter((t) => isTaskDone(t, sections));
    const overdue: Task[] = [],
      dueToday: Task[] = [],
      upcoming: Task[] = [],
      noDate: Task[] = [];
    pending.forEach((t) => {
      if (!t.dueDate) {
        noDate.push(t);
        return;
      }
      const d = new Date(`${t.dueDate}T00:00:00`);
      if (d < today) overdue.push(t);
      else if (d.getTime() === today.getTime()) dueToday.push(t);
      else upcoming.push(t);
    });
    const byDate = (a: Task, b: Task) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
    return {
      overdue: overdue.sort(byDate),
      today: dueToday.sort(byDate),
      upcoming: upcoming.sort(byDate),
      noDate,
      done: done.sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? "")),
    };
  }, [mine, sections, today]);

  const toggle = (t: Task, done: boolean) =>
    update(t.id, { sectionId: done ? doneSection.id : todoSection.id });

  return (
    <div>
      <PageHeader
        title="Minhas tarefas"
        description="Tudo que está atribuído a você, organizado por prazo."
      />
      {mine.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa atribuída"
          description="Quando uma tarefa for atribuída a você, ela aparece aqui."
        />
      ) : (
        <div className="space-y-6 max-w-2xl">
          <Group
            title="Atrasadas"
            tasks={groups.overdue}
            accent="destructive"
            projName={projName}
            onToggle={toggle}
            onOpen={setOpenTaskId}
          />
          <Group
            title="Hoje"
            tasks={groups.today}
            projName={projName}
            onToggle={toggle}
            onOpen={setOpenTaskId}
          />
          <Group
            title="Em breve"
            tasks={groups.upcoming}
            projName={projName}
            onToggle={toggle}
            onOpen={setOpenTaskId}
          />
          <Group
            title="Sem prazo"
            tasks={groups.noDate}
            projName={projName}
            onToggle={toggle}
            onOpen={setOpenTaskId}
          />
          <Group
            title="Concluídas"
            tasks={groups.done}
            projName={projName}
            onToggle={toggle}
            onOpen={setOpenTaskId}
            muted
          />
        </div>
      )}
      <TaskDetailSheet taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

function Group({
  title,
  tasks,
  projName,
  onToggle,
  onOpen,
  accent,
  muted,
}: {
  title: string;
  tasks: Task[];
  projName: (id?: string) => string | undefined;
  onToggle: (t: Task, done: boolean) => void;
  onOpen: (id: string) => void;
  accent?: "destructive";
  muted?: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h3
        className={`text-xs uppercase tracking-wide font-medium mb-2 ${accent === "destructive" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {title} <span className="text-muted-foreground/70">({tasks.length})</span>
      </h3>
      <Card>
        <CardContent className="p-0 divide-y">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <Checkbox checked={!!muted} onCheckedChange={(c) => onToggle(t, !!c)} />
              <button className="flex-1 min-w-0 text-left" onClick={() => onOpen(t.id)}>
                <p
                  className={`text-sm truncate ${muted ? "line-through text-muted-foreground" : ""}`}
                >
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[projName(t.projectId), t.dueDate ? formatDate(t.dueDate) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </button>
              <StatusBadge value={t.priority} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
