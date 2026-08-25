import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { useClients, useProjects, useProposals, useTransactions, useTasks, formatBRL } from "@/lib/storage";
import type { Project, ProjectStatus, ProjectType, Task, TaskPriority, TaskStatus, Transaction } from "@/lib/types";
import { toast } from "sonner";

const types: ProjectType[] = ["Unifamiliar", "Multifamiliar", "Comercial"];
const statuses: ProjectStatus[] = ["Em andamento", "Aguardando cliente", "Entregue", "Arquivado"];
const priorities: TaskPriority[] = ["Alta", "Média", "Baixa"];
const taskStatuses: TaskStatus[] = ["A fazer", "Em andamento", "Concluído"];

type Installment = { date: string; value: number };
type TaskDraft = { id?: string; title: string; dueDate: string; priority: TaskPriority; status: TaskStatus };

const addMonths = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00`).getTime());


export function ProjectFormDialog({
  trigger,
  initial,
  onSaved,
}: {
  trigger: React.ReactNode;
  initial?: Project;
  onSaved?: () => void;
}) {
  const { items: clients } = useClients();
  const { items: proposals } = useProposals();
  const { add, update } = useProjects();
  const { items: transactions, add: addTx, remove: removeTx } = useTransactions();
  const { items: allTasks, add: addTask, update: updateTask, remove: removeTask } = useTasks();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Omit<Project, "id">>(
    initial ?? {
      name: "",
      clientId: clients[0]?.id ?? "",
      type: "Unifamiliar",
      status: "Em andamento",
      startDate: today,
      deadline: today,
      value: 0,
      notes: "",
    },
  );

  const existingInstallments = useMemo(
    () => (initial ? transactions.filter(t => t.projectId === initial.id && t.installment != null) : []),
    [transactions, initial],
  );

  const [count, setCount] = useState<number>(existingInstallments.length);
  const [installments, setInstallments] = useState<Installment[]>(
    existingInstallments
      .sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0))
      .map(t => ({ date: t.date, value: t.value })),
  );

  const buildInstallments = (n: number) => {
    setCount(n);
    if (!n || n < 1) { setInstallments([]); return; }
    const base = form.value ? Math.round((form.value / n) * 100) / 100 : 0;
    const start = isValidDate(form.startDate) ? form.startDate : today;
    setInstallments(
      Array.from({ length: n }, (_, i) => installments[i] ?? { date: addMonths(start, i), value: base }),
    );
  };

  const setInst = (i: number, patch: Partial<Installment>) => {
    setInstallments(prev => {
      const next = prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
      if (i === 0 && "value" in patch && patch.value != null && count > 1 && form.value > 0) {
        const remaining = Math.max(0, form.value - Number(patch.value));
        const base = Math.round((remaining / (count - 1)) * 100) / 100;
        for (let idx = 1; idx < next.length; idx++) next[idx].value = base;
      }
      return next;
    });
  };

  const totalInstallments = installments.reduce((s, i) => s + (Number(i.value) || 0), 0);

  const existingTasks = useMemo(
    () => (initial ? allTasks.filter(t => t.projectId === initial.id) : []),
    [allTasks, initial],
  );
  const [tasks, setTasks] = useState<TaskDraft[]>(
    existingTasks.map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate ?? "",
      priority: t.priority,
      status: t.status,
    })),
  );
  const setTask = (i: number, patch: Partial<TaskDraft>) =>
    setTasks(prev => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTaskRow = () =>
    setTasks(prev => [...prev, { title: "", dueDate: form.deadline || today, priority: "Média", status: "A fazer" }]);


  const submit = () => {
    if (!form.name.trim() || !form.clientId) {
      toast.error("Informe nome e cliente.");
      return;
    }
    if (!isValidDate(form.startDate) || !isValidDate(form.deadline)) {
      toast.error("Datas de início e prazo inválidas.");
      return;
    }
    if (form.deadline < form.startDate) {
      toast.error("O prazo não pode ser anterior à data de início.");
      return;
    }
    if (installments.some(i => !isValidDate(i.date))) {
      toast.error("Informe vencimentos válidos para todas as parcelas.");
      return;
    }
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.some(t => t.dueDate && !isValidDate(t.dueDate))) {
      toast.error("Informe prazos válidos para as tarefas.");
      return;
    }

    const projectId = initial ? initial.id : add(form).id;
    if (initial) update(initial.id, form);

    if (count > 0 || existingInstallments.length > 0) {
      existingInstallments.forEach(t => removeTx(t.id));
      installments.forEach((inst, i) => {
        const tx: Omit<Transaction, "id"> = {
          description: `${form.name} — parcela ${i + 1}/${installments.length}`,
          projectId,
          type: "Receita",
          value: Number(inst.value) || 0,
          date: inst.date,
          status: "Pendente",
          installment: i + 1,
        };
        addTx(tx);
      });
    }

    const keptIds = new Set(validTasks.map(t => t.id).filter(Boolean) as string[]);
    existingTasks.filter(t => !keptIds.has(t.id)).forEach(t => removeTask(t.id));
    validTasks.forEach(t => {
      const payload: Omit<Task, "id"> = {
        title: t.title.trim(),
        projectId,
        dueDate: t.dueDate || undefined,
        priority: t.priority,
        status: t.status,
      };
      if (t.id) updateTask(t.id, payload);
      else addTask(payload);
    });


    toast.success(initial ? "Projeto atualizado." : "Projeto criado.");
    setOpen(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="tarefas" className="flex-1">Tarefas{tasks.length ? ` (${tasks.length})` : ""}</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="grid gap-4 py-2">

          <Field label="Nome do projeto">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Residência Silva — Cálculo Estrutural" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cliente">
              <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ProjectType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Proposta">
            <Select value={form.proposalId ?? "none"} onValueChange={v => setForm({ ...form, proposalId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="Selecione uma proposta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem proposta</SelectItem>
                {proposals
                  .filter(p => !form.clientId || p.clientId === form.clientId)
                  .map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.description} — {formatBRL(p.value)}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProjectStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Início">
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Prazo">
            <Input type="date" min={form.startDate} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          </Field>

          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Financeiro</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor do contrato">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input className="pl-9" type="number" min={0} value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} />
                </div>
              </Field>
              <Field label="Qtd. de parcelas">
                <Input type="number" min={0} max={60} value={count} onChange={e => buildInstallments(Math.max(0, Math.min(60, Number(e.target.value))))} />
              </Field>
            </div>

            {installments.length > 0 && (
              <div className="space-y-2">
                {installments.map((inst, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">{i + 1}ª</span>
                    <Input type="date" value={inst.date} onChange={e => setInst(i, { date: e.target.value })} />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input className="pl-9" type="number" min={0} value={inst.value} onChange={e => setInst(i, { value: Number(e.target.value) })} />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Total das parcelas: <span className="font-medium text-foreground">{formatBRL(totalInstallments)}</span>
                  {form.value > 0 && Math.abs(totalInstallments - form.value) > 0.5 && " (difere do valor do contrato)"}
                </p>
              </div>
            )}
          </div>

          <Field label="Observações">
            <Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Field>
          </TabsContent>

          <TabsContent value="tarefas" className="space-y-3 py-2">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa. Adicione tarefas para este projeto.</p>
            )}
            {tasks.map((t, i) => (
              <div key={t.id ?? i} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Field label="Nome da tarefa">
                      <Input value={t.title} onChange={e => setTask(i, { title: e.target.value })} placeholder="Ex.: Lançamento da estrutura" />
                    </Field>
                  </div>
                  <Button variant="ghost" size="icon" className="mt-6" onClick={() => setTasks(prev => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prazo">
                    <Input type="date" value={t.dueDate} onChange={e => setTask(i, { dueDate: e.target.value })} />
                  </Field>
                  <Field label="Prioridade">
                    <Select value={t.priority} onValueChange={v => setTask(i, { priority: v as TaskPriority })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Status">
                  <Select value={t.status} onValueChange={v => setTask(i, { status: v as TaskStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTaskRow}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar tarefa
            </Button>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Criar projeto"}</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
