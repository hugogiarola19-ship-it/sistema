import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useTasks } from "@/lib/storage";
import { useAppUsers } from "@/hooks/useAppUsers";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";
import { toast } from "sonner";

const priorities: TaskPriority[] = ["Alta", "Média", "Baixa"];
const statuses: TaskStatus[] = ["A fazer", "Em andamento", "Concluído"];

export function TaskFormDialog({ trigger, defaultStatus, defaultProjectId, initial }: { trigger: React.ReactNode; defaultStatus?: TaskStatus; defaultProjectId?: string; initial?: Task }) {
  const { items: projects } = useProjects();
  const { add, update } = useTasks();
  const { data: users = [] } = useAppUsers();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Task, "id">>(
    initial ?? { title: "", projectId: defaultProjectId, dueDate: "", priority: "Média", status: defaultStatus ?? "A fazer", weekly: true },
  );

  const submit = () => {
    if (!form.title.trim()) { toast.error("Informe o título."); return; }
    const payload = {
      ...form,
      projectId: form.projectId || undefined,
      dueDate: form.dueDate || undefined,
      assigneeId: form.assigneeId || undefined,
    };
    if (initial) { update(initial.id, payload); toast.success("Tarefa atualizada."); }
    else { add(payload); toast.success("Tarefa criada."); }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Título"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></F>
          <F label="Projeto (opcional)">
            <Select value={form.projectId ?? "none"} onValueChange={v => setForm({ ...form, projectId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem projeto</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Responsável (funcionário)">
            <Select value={form.assigneeId ?? "none"} onValueChange={v => setForm({ ...form, assigneeId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <div className="grid grid-cols-3 gap-4">
            <F label="Prazo"><Input type="date" value={form.dueDate ?? ""} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></F>
            <F label="Prioridade">
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Status">
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Criar tarefa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
