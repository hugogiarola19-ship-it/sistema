import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Wallet,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import {
  useProjects,
  useClients,
  useTransactions,
  useExpenseCategories,
  useRevenueCategories,
  useInvestmentCategories,
  TAX_EXPENSE_CATEGORIES,
  FIXED_EXPENSE_CATEGORIES,
  MARKETING_EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  uid,
  formatBRL,
  formatDate,
} from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  const { items, remove, update } = useTransactions();
  const { items: projects } = useProjects();
  const { items: clients } = useClients();
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

  const pendingForMonth = (y: number, m: number) => {
    const tx = items.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y && t.status === "Pendente";
    });
    const sum = (type: TxType) =>
      tx.filter((t) => t.type === type).reduce((s, t) => s + t.value, 0);
    const despesaTotal = sum("Despesa");
    const taxTotal = tx
      .filter(
        (t) => t.type === "Despesa" && TAX_EXPENSE_CATEGORIES.includes(t.expenseCategory ?? ""),
      )
      .reduce((s, t) => s + t.value, 0);
    const aReceber = sum("Receita");
    const investimentosPend = sum("Investimento");
    const proLaborePend = sum("Pró-labore");
    return {
      aReceber,
      despesasOperacionais: despesaTotal - taxTotal,
      impostos: taxTotal,
      investimentos: investimentosPend,
      proLabore: proLaborePend,
      saldoPrevisto: aReceber - despesaTotal - investimentosPend - proLaborePend,
    };
  };
  const nextCursor = new Date(cursor.y, cursor.m + 1, 1);
  const flowThisMonth = pendingForMonth(cursor.y, cursor.m);
  const flowNextMonth = pendingForMonth(nextCursor.getFullYear(), nextCursor.getMonth());
  const nextMonthLabel = nextCursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const taxes = monthTx
    .filter(
      (t) =>
        t.type === "Despesa" &&
        t.status === "Pago" &&
        TAX_EXPENSE_CATEGORIES.includes(t.expenseCategory ?? ""),
    )
    .reduce((s, t) => s + t.value, 0);
  const result = received - expenses - investments - proLabore;

  const avgFixedMonthly = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const t of items) {
      if (t.type !== "Despesa" || t.status !== "Pago") continue;
      if (!FIXED_EXPENSE_CATEGORIES.includes(t.expenseCategory ?? "")) continue;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + t.value);
    }
    if (byMonth.size === 0) return 0;
    return [...byMonth.values()].reduce((s, v) => s + v, 0) / byMonth.size;
  }, [items]);
  const reserveMin = avgFixedMonthly * 3;
  const reserveMax = avgFixedMonthly * 6;
  const accumulatedBalance = useMemo(
    () =>
      items.reduce((s, t) => {
        if (t.status !== "Pago") return s;
        return t.type === "Receita" ? s + t.value : s - t.value;
      }, 0),
    [items],
  );
  const reserveProgress =
    reserveMax > 0 ? Math.min(100, (accumulatedBalance / reserveMax) * 100) : 0;
  const reserveStatus =
    reserveMax === 0
      ? "Sem despesas fixas suficientes para calcular uma meta."
      : accumulatedBalance < reserveMin
        ? "Abaixo da reserva mínima recomendada."
        : accumulatedBalance < reserveMax
          ? "Dentro da faixa recomendada."
          : "Reserva completa.";

  const marketingSpend = monthTx
    .filter(
      (t) =>
        t.type === "Despesa" &&
        t.status === "Pago" &&
        MARKETING_EXPENSE_CATEGORIES.includes(t.expenseCategory ?? ""),
    )
    .reduce((s, t) => s + t.value, 0);
  const newClientsThisMonth = clients.filter((c) => {
    if (!c.createdAt) return false;
    const d = new Date(c.createdAt);
    return d.getMonth() === cursor.m && d.getFullYear() === cursor.y;
  }).length;
  const cac = newClientsThisMonth > 0 ? marketingSpend / newClientsThisMonth : null;

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const projName = (id?: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const categoryLabel = (t: Transaction) => {
    if (t.type === "Despesa") return t.expenseCategory ?? projName(t.projectId);
    if (t.type === "Receita") {
      const base = t.revenueCategory ?? projName(t.projectId);
      return t.paymentMethod ? `${base} · ${t.paymentMethod}` : base;
    }
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
            <Button variant="outline" asChild>
              <Link to="/financial/cards">
                <CreditCardIcon className="h-4 w-4 mr-1" /> Cartões
              </Link>
            </Button>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Reserva financeira</CardTitle>
          <p className="text-xs text-muted-foreground">
            Meta de 3 a 6 meses de despesas fixas, comparada ao saldo acumulado de todos os
            lançamentos pagos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Despesas fixas/mês
              </p>
              <p className="font-medium">{formatBRL(avgFixedMonthly)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Reserva ideal (3–6 meses)
              </p>
              <p className="font-medium">
                {formatBRL(reserveMin)} – {formatBRL(reserveMax)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Saldo acumulado
              </p>
              <p className={`font-medium ${accumulatedBalance >= 0 ? "" : "text-destructive"}`}>
                {formatBRL(accumulatedBalance)}
              </p>
            </div>
          </div>
          <div>
            <Progress value={reserveProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">{reserveStatus}</p>
          </div>
        </CardContent>
      </Card>

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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Marketing e comercial</CardTitle>
          <p className="text-xs text-muted-foreground">
            Quanto o escritório investe para conseguir clientes.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Gasto em marketing
              </p>
              <p className="font-medium">{formatBRL(marketingSpend)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Novos clientes
              </p>
              <p className="font-medium">{newClientsThisMonth}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Custo por cliente (CAC)
              </p>
              <p className="font-medium">{cac != null ? formatBRL(cac) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Fluxo de caixa projetado</CardTitle>
          <p className="text-xs text-muted-foreground">
            Valores ainda pendentes (não pagos/recebidos) lançados para cada mês.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium py-1.5">Categoria</th>
                <th className="text-right font-medium py-1.5 capitalize">{monthLabel}</th>
                <th className="text-right font-medium py-1.5 capitalize">{nextMonthLabel}</th>
              </tr>
            </thead>
            <tbody>
              <FlowRow
                label="A receber"
                a={flowThisMonth.aReceber}
                b={flowNextMonth.aReceber}
                accent="success"
              />
              <FlowRow
                label="Despesas"
                a={-flowThisMonth.despesasOperacionais}
                b={-flowNextMonth.despesasOperacionais}
                accent="destructive"
              />
              <FlowRow
                label="Impostos"
                a={-flowThisMonth.impostos}
                b={-flowNextMonth.impostos}
                accent="destructive"
              />
              <FlowRow
                label="Investimentos"
                a={-flowThisMonth.investimentos}
                b={-flowNextMonth.investimentos}
                accent="primary"
              />
              <FlowRow
                label="Pró-labore"
                a={-flowThisMonth.proLabore}
                b={-flowNextMonth.proLabore}
                accent="warning"
              />
              <tr className="border-t">
                <td className="py-2 font-semibold">Saldo previsto</td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {formatBRL(flowThisMonth.saldoPrevisto)}
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">
                  {formatBRL(flowNextMonth.saldoPrevisto)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

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
                    <TxStatusSelect
                      status={t.status}
                      onChange={(s) => update(t.id, { status: s })}
                    />
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
                    <TxStatusSelect
                      status={t.status}
                      onChange={(s) => update(t.id, { status: s })}
                    />
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

function TxStatusSelect({
  status,
  onChange,
}: {
  status: TxStatus;
  onChange: (status: TxStatus) => void;
}) {
  const colorClass =
    status === "Pago"
      ? "border-success/30 bg-success/15 text-success"
      : status === "Pendente"
        ? "border-warning/30 bg-warning/15 text-warning-foreground"
        : "border-destructive/30 bg-destructive/10 text-destructive";
  return (
    <Select value={status} onValueChange={(v) => onChange(v as TxStatus)}>
      <SelectTrigger
        className={`h-7 w-auto gap-1 rounded-full border px-2.5 py-0 text-xs font-medium shadow-none focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60 ${colorClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {(["Pago", "Pendente", "Cancelado"] as TxStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FlowRow({
  label,
  a,
  b,
  accent,
}: {
  label: string;
  a: number;
  b: number;
  accent: "success" | "warning" | "destructive" | "primary";
}) {
  const c =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-warning-foreground"
        : accent === "primary"
          ? "text-primary"
          : "text-destructive";
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className={`py-1.5 text-right tabular-nums ${c}`}>{formatBRL(a)}</td>
      <td className={`py-1.5 text-right tabular-nums ${c}`}>{formatBRL(b)}</td>
    </tr>
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
                    {categoryHook.groups.map((g) => (
                      <SelectGroup key={g.group}>
                        <SelectLabel>{g.group}</SelectLabel>
                        {g.items.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectGroup>
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
          {form.type === "Receita" && (
            <F label="Meio de recebimento (opcional)">
              <Select
                value={form.paymentMethod ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, paymentMethod: v === "none" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
