import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Wallet } from "lucide-react";
import {
  useProjects,
  useTransactions,
  useExpenseCategories,
  useRevenueCategories,
  useInvestmentCategories,
  TAX_EXPENSE_CATEGORIES,
  uid,
  formatBRL,
  formatDate,
} from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Transaction, TxStatus, TxType } from "@/lib/types";

export const Route = createFileRoute("/financial")({
  head: () => ({
    meta: [
      { title: "Financeiro — Giarola Engenharia" },
      { name: "description", content: "Receitas, despesas e resultado mensal." },
    ],
  }),
  component: FinancialPage,
});

function FinancialPage() {
  const { items, remove } = useTransactions();
  const { items: projects } = useProjects();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [view, setView] = useViewMode("financial", "lista");

  const monthTx = useMemo(
    () =>
      items
        .filter((t) => {
          const d = new Date(t.date);
          return d.getMonth() === cursor.m && d.getFullYear() === cursor.y;
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [items, cursor],
  );

  const contracted = monthTx.filter((t) => t.type === "Receita").reduce((s, t) => s + t.value, 0);
  const received = monthTx
    .filter((t) => t.type === "Receita" && t.status === "Pago")
    .reduce((s, t) => s + t.value, 0);
  const pending = contracted - received;
  const paid = (type: Transaction["type"]) =>
    monthTx.filter((t) => t.type === type && t.status === "Pago").reduce((s, t) => s + t.value, 0);
  const expenses = paid("Despesa");
  const investments = paid("Investimento");
  const proLabore = paid("Pró-labore");
  const taxes = monthTx
    .filter(
      (t) =>
        t.type === "Despesa" &&
        t.status === "Pago" &&
        TAX_EXPENSE_CATEGORIES.includes(t.expenseCategory ?? ""),
    )
    .reduce((s, t) => s + t.value, 0);
  const result = received - expenses - investments - proLabore;

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const projName = (id?: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const categoryLabel = (t: Transaction) => {
    if (t.type === "Despesa") return t.expenseCategory ?? projName(t.projectId);
    if (t.type === "Receita") return t.revenueCategory ?? projName(t.projectId);
    if (t.type === "Investimento") return t.investmentCategory ?? projName(t.projectId);
    return projName(t.projectId);
  };
  const txColorClass = (type: TxType) =>
    type === "Receita"
      ? "text-success"
      : type === "Investimento"
        ? "text-primary"
        : type === "Pró-labore"
          ? "text-warning-foreground"
          : "text-destructive";
  const txSign = (type: TxType) => (type === "Receita" ? "+" : "−");

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
            <TransactionFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Novo lançamento
                </Button>
              }
            />
          </>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={() => shift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize min-w-[160px] text-center">{monthLabel}</div>
        <Button variant="outline" size="icon" onClick={() => shift(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-3">
        <Metric label="Contratado" value={formatBRL(contracted)} />
        <Metric label="Recebido" value={formatBRL(received)} accent="success" />
        <Metric label="A receber" value={formatBRL(pending)} accent="warning" />
        <Metric label="Resultado" value={formatBRL(result)} bold />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <Metric label="Despesas" value={formatBRL(expenses)} accent="destructive" />
        <Metric label="Impostos" value={formatBRL(taxes)} accent="destructive" />
        <Metric label="Investimentos" value={formatBRL(investments)} accent="primary" />
        <Metric label="Pró-labore" value={formatBRL(proLabore)} accent="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos do mês</CardTitle>
        </CardHeader>
        <CardContent>
          {monthTx.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Sem lançamentos neste mês"
              action={
                <TransactionFormDialog
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-1" /> Adicionar lançamento
                    </Button>
                  }
                />
              }
            />
          ) : view === "bloco" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {monthTx.map((t) => (
                <div key={t.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{t.description}</p>
                    <ConfirmDelete
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      }
                      title="Excluir lançamento?"
                      onConfirm={() => {
                        remove(t.id);
                        toast.success("Lançamento excluído.");
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(t.date)} · {t.type} · {categoryLabel(t)}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <StatusBadge value={t.status} />
                    <span className={`text-sm font-semibold tabular-nums ${txColorClass(t.type)}`}>
                      {txSign(t.type)} {formatBRL(t.value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {monthTx.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(t.date)} · {t.type} · {categoryLabel(t)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={t.status} />
                    <span className={`text-sm font-semibold tabular-nums ${txColorClass(t.type)}`}>
                      {txSign(t.type)} {formatBRL(t.value)}
                    </span>
                    <ConfirmDelete
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title="Excluir lançamento?"
                      onConfirm={() => {
                        remove(t.id);
                        toast.success("Lançamento excluído.");
                      }}
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

function Metric({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent?: "success" | "warning" | "destructive" | "primary";
  bold?: boolean;
}) {
  const c =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-warning-foreground"
        : accent === "destructive"
          ? "text-destructive"
          : accent === "primary"
            ? "text-primary"
            : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-lg mt-1 tabular-nums ${bold ? "font-semibold" : "font-medium"} ${c}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

const RECURRING_TYPES: TxType[] = ["Despesa", "Pró-labore"];

function TransactionFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const { add } = useTransactions();
  const { items: projects } = useProjects();
  const expenseCats = useExpenseCategories();
  const revenueCats = useRevenueCategories();
  const investmentCats = useInvestmentCategories();
  const [open, setOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [months, setMonths] = useState(12);
  const [addingCat, setAddingCat] = useState(false);
  const [form, setForm] = useState<Omit<Transaction, "id">>({
    description: "",
    projectId: undefined,
    type: "Receita",
    value: 0,
    date: new Date().toISOString().slice(0, 10),
    status: "Pendente",
  });

  const categoryField: Partial<
    Record<TxType, "expenseCategory" | "revenueCategory" | "investmentCategory">
  > = {
    Despesa: "expenseCategory",
    Receita: "revenueCategory",
    Investimento: "investmentCategory",
  };
  const categoryHook = { Despesa: expenseCats, Receita: revenueCats, Investimento: investmentCats }[
    form.type as "Despesa" | "Receita" | "Investimento"
  ];
  const activeField = categoryField[form.type];

  const submit = () => {
    if (!form.description.trim() || !form.value) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    if (form.type === "Despesa" && !form.expenseCategory) {
      toast.error("Selecione a categoria da despesa.");
      return;
    }
    if (form.type === "Investimento" && !form.investmentCategory) {
      toast.error("Selecione a categoria do investimento.");
      return;
    }
    const base = {
      ...form,
      projectId: form.type === "Pró-labore" ? undefined : form.projectId || undefined,
      expenseCategory: form.type === "Despesa" ? form.expenseCategory : undefined,
      revenueCategory: form.type === "Receita" ? form.revenueCategory : undefined,
      investmentCategory: form.type === "Investimento" ? form.investmentCategory : undefined,
    };
    const isRecurring = RECURRING_TYPES.includes(form.type) && recurring;
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
      toast.success(`${count} lançamentos mensais criados.`);
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
    if (!value || !activeField || !categoryHook) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    categoryHook.addCategory(value);
    setForm((f) => ({ ...f, [activeField]: value }));
    setNewCat("");
    setAddingCat(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Descrição">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Tipo">
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    type: v as TxType,
                    expenseCategory: undefined,
                    revenueCategory: undefined,
                    investmentCategory: undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                  <SelectItem value="Pró-labore">Pró-labore</SelectItem>
                </SelectContent>
              </Select>
            </F>
            <F label="Valor (R$)">
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </F>
            <F label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as TxStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Pago", "Pendente", "Cancelado"] as TxStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
          {activeField && categoryHook && (
            <F
              label={
                form.type === "Receita"
                  ? "Categoria da receita (opcional)"
                  : form.type === "Despesa"
                    ? "Categoria da despesa"
                    : "Categoria do investimento"
              }
            >
              <div className="grid gap-2">
                <Select
                  value={(form[activeField] as string) ?? ""}
                  onValueChange={(v) => setForm({ ...form, [activeField]: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryHook.categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {addingCat ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Nova categoria"
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          confirmCat();
                        }
                      }}
                    />
                    <Button type="button" onClick={confirmCat}>
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setAddingCat(false);
                        setNewCat("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => setAddingCat(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar outra categoria
                  </Button>
                )}
              </div>
            </F>
          )}
          {RECURRING_TYPES.includes(form.type) && (
            <div className="rounded-md border p-3 grid gap-3">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Checkbox checked={recurring} onCheckedChange={(v) => setRecurring(v === true)} />
                {form.type === "Pró-labore"
                  ? "Pró-labore fixo todo mês"
                  : "Despesa recorrente todo mês"}
              </label>
              {recurring && (
                <F label="Repetir por (meses)">
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  />
                </F>
              )}
              {recurring && (
                <p className="text-xs text-muted-foreground">
                  Serão criados lançamentos mensais a partir da data informada, com o mesmo valor.
                </p>
              )}
            </div>
          )}
          {form.type !== "Pró-labore" && (
            <F label="Projeto (opcional)">
              <Select
                value={form.projectId ?? "none"}
                onValueChange={(v) => setForm({ ...form, projectId: v === "none" ? undefined : v })}
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
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Criar lançamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
