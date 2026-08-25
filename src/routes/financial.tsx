import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Wallet } from "lucide-react";
import { useProjects, useTransactions, useExpenseCategories, uid, formatBRL, formatDate } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Transaction, TxStatus, TxType } from "@/lib/types";

export const Route = createFileRoute("/financial")({
  head: () => ({ meta: [{ title: "Financeiro — HG Estrutural" }, { name: "description", content: "Receitas, despesas e resultado mensal." }] }),
  component: FinancialPage,
});

function FinancialPage() {
  const { items, remove } = useTransactions();
  const { items: projects } = useProjects();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [view, setView] = useViewMode("financial", "lista");

  const monthTx = useMemo(() => items
    .filter(t => { const d = new Date(t.date); return d.getMonth() === cursor.m && d.getFullYear() === cursor.y; })
    .sort((a, b) => b.date.localeCompare(a.date)), [items, cursor]);

  const contracted = monthTx.filter(t => t.type === "Receita").reduce((s, t) => s + t.value, 0);
  const received = monthTx.filter(t => t.type === "Receita" && t.status === "Pago").reduce((s, t) => s + t.value, 0);
  const pending = contracted - received;
  const expenses = monthTx.filter(t => t.type === "Despesa" && t.status === "Pago").reduce((s, t) => s + t.value, 0);
  const result = received - expenses;

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const projName = (id?: string) => projects.find(p => p.id === id)?.name ?? "—";

  const shift = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Acompanhamento mensal do escritório."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <TransactionFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" /> Novo lançamento</Button>} />
          </>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-sm font-medium capitalize min-w-[160px] text-center">{monthLabel}</div>
        <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <Metric label="Contratado" value={formatBRL(contracted)} />
        <Metric label="Recebido" value={formatBRL(received)} accent="success" />
        <Metric label="A receber" value={formatBRL(pending)} accent="warning" />
        <Metric label="Despesas" value={formatBRL(expenses)} accent="destructive" />
        <Metric label="Resultado" value={formatBRL(result)} bold />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos do mês</CardTitle></CardHeader>
        <CardContent>
          {monthTx.length === 0 ? (
            <EmptyState icon={Wallet} title="Sem lançamentos neste mês" action={<TransactionFormDialog trigger={<Button><Plus className="h-4 w-4 mr-1" /> Adicionar lançamento</Button>} />} />
          ) : view === "bloco" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {monthTx.map(t => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{t.description}</p>
                    <ConfirmDelete
                      trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      title="Excluir lançamento?"
                      onConfirm={() => { remove(t.id); toast.success("Lançamento excluído."); }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.date)} · {t.expenseCategory ?? projName(t.projectId)}</p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <StatusBadge value={t.status} />
                    <span className={`text-sm font-semibold tabular-nums ${t.type === "Receita" ? "text-success" : "text-destructive"}`}>
                      {t.type === "Receita" ? "+" : "−"} {formatBRL(t.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {monthTx.map(t => (
                <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.date)} · {t.expenseCategory ?? projName(t.projectId)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={t.status} />
                    <span className={`text-sm font-semibold tabular-nums ${t.type === "Receita" ? "text-success" : "text-destructive"}`}>
                      {t.type === "Receita" ? "+" : "−"} {formatBRL(t.value)}
                    </span>
                    <ConfirmDelete
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      title="Excluir lançamento?"
                      onConfirm={() => { remove(t.id); toast.success("Lançamento excluído."); }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, accent, bold }: { label: string; value: string; accent?: "success" | "warning" | "destructive"; bold?: boolean }) {
  const c = accent === "success" ? "text-success" : accent === "warning" ? "text-warning-foreground" : accent === "destructive" ? "text-destructive" : "";
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg mt-1 tabular-nums ${bold ? "font-semibold" : "font-medium"} ${c}`}>{value}</p>
    </CardContent></Card>
  );
}

function TransactionFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const { add } = useTransactions();
  const { items: projects } = useProjects();
  const { categories, addCategory } = useExpenseCategories();
  const [open, setOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [months, setMonths] = useState(12);
  const [addingCat, setAddingCat] = useState(false);
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    description: "", projectId: undefined, type: "Receita", value: 0, date: new Date().toISOString().slice(0, 10), status: "Pendente",
  });

  const submit = () => {
    if (!form.description.trim() || !form.value) { toast.error("Preencha descrição e valor."); return; }
    if (form.type === "Despesa" && !form.expenseCategory) { toast.error("Selecione o tipo de despesa."); return; }
    const base = {
      ...form,
      projectId: form.projectId || undefined,
      expenseCategory: form.type === "Despesa" ? form.expenseCategory : undefined,
    };
    const isRecurring = form.type === "Despesa" && recurring;
    if (isRecurring) {
      const count = Math.max(1, Math.min(60, Math.floor(months) || 1));
      const groupId = uid();
      const start = new Date(form.date + "T00:00:00");
      for (let i = 0; i < count; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(start.getDate(), lastDay));
        add({
          ...base,
          recurringId: groupId,
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          status: i === 0 ? form.status : "Pendente",
        });
      }
      toast.success(`${count} despesas mensais criadas.`);
    } else {
      add(base);
      toast.success("Lançamento criado.");
    }
    setRecurring(false);
    setMonths(12);
    setOpen(false);
  };

  const confirmCat = () => {
    const value = newCat.trim();
    if (!value) { toast.error("Informe o nome do tipo."); return; }
    addCategory(value);
    setForm(f => ({ ...f, expenseCategory: value }));
    setNewCat("");
    setAddingCat(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Descrição"><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Tipo">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as TxType, expenseCategory: v === "Despesa" ? form.expenseCategory : undefined })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Receita">Receita</SelectItem><SelectItem value="Despesa">Despesa</SelectItem></SelectContent>
              </Select>
            </F>
            <F label="Valor (R$)"><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: Number(e.target.value) })} /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Data"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></F>
            <F label="Status">
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as TxStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["Pago", "Pendente", "Cancelado"] as TxStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
          {form.type === "Despesa" && (
            <F label="Tipo de despesa">
              <div className="grid gap-2">
                <Select value={form.expenseCategory ?? ""} onValueChange={v => setForm({ ...form, expenseCategory: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {addingCat ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Novo tipo de despesa"
                      value={newCat}
                      onChange={e => setNewCat(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmCat(); } }}
                    />
                    <Button type="button" onClick={confirmCat}>Salvar</Button>
                    <Button type="button" variant="ghost" onClick={() => { setAddingCat(false); setNewCat(""); }}>Cancelar</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="justify-start" onClick={() => setAddingCat(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar outro tipo
                  </Button>
                )}
              </div>
            </F>
          )}
          {form.type === "Despesa" && (
            <div className="rounded-md border p-3 grid gap-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Checkbox checked={recurring} onCheckedChange={v => setRecurring(v === true)} />
                Despesa recorrente todo mês
              </label>
              {recurring && (
                <F label="Repetir por (meses)">
                  <Input type="number" min={1} max={60} value={months} onChange={e => setMonths(Number(e.target.value))} />
                </F>
              )}
              {recurring && (
                <p className="text-xs text-muted-foreground">
                  Serão criados lançamentos mensais a partir da data informada, com o mesmo valor.
                </p>
              )}
            </div>
          )}
          <F label="Projeto (opcional)">
            <Select value={form.projectId ?? "none"} onValueChange={v => setForm({ ...form, projectId: v === "none" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem projeto</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar lançamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
