import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  CreditCard as CreditCardIcon,
  CheckCircle2,
} from "lucide-react";
import {
  useCreditCards,
  useCardPurchases,
  useCardInvoicePayments,
  useTransactions,
  useProjects,
  useExpenseCategories,
  invoiceTotalForMonth,
  invoiceItemsForMonth,
  outstandingCardBalance,
  formatBRL,
  formatDate,
} from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { CreditCard, CardPurchase } from "@/lib/types";

export const Route = createFileRoute("/financial_/cards")({
  head: () => ({
    meta: [
      { title: "Cartões de crédito — Giarola Engenharia" },
      { name: "description", content: "Cartões, compras parceladas e faturas." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const { items: cards, remove: removeCard } = useCreditCards();
  const { items: purchases } = useCardPurchases();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = cards.find((c) => c.id === selectedId) ?? cards[0] ?? null;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link to="/financial">
          <ArrowLeft className="h-4 w-4 mr-1" /> Financeiro
        </Link>
      </Button>
      <PageHeader
        title="Cartões de crédito"
        description="Cartões, compras parceladas e controle de faturas."
        actions={
          <CreditCardFormDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Novo cartão
              </Button>
            }
          />
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="Nenhum cartão cadastrado"
          action={
            <CreditCardFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Cadastrar primeiro cartão
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-6">
            {cards.map((c) => (
              <CardSummary
                key={c.id}
                card={c}
                purchases={purchases}
                active={selected?.id === c.id}
                onSelect={() => setSelectedId(c.id)}
                onDelete={() => {
                  removeCard(c.id);
                  if (selectedId === c.id) setSelectedId(null);
                  toast.success("Cartão excluído.");
                }}
              />
            ))}
          </div>

          {selected && <CardInvoicePanel card={selected} />}
        </>
      )}
    </div>
  );
}

function CardSummary({
  card,
  purchases,
  active,
  onSelect,
  onDelete,
}: {
  card: CreditCard;
  purchases: CardPurchase[];
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { items: payments } = useCardInvoicePayments();
  const now = new Date();
  const currentInvoice = invoiceTotalForMonth(
    purchases,
    card.id,
    card.closingDay,
    now.getFullYear(),
    now.getMonth(),
  );
  const outstanding = outstandingCardBalance(purchases, payments, card.id, card.closingDay);
  const available = Math.max(0, card.limit - outstanding);
  const usagePct = card.limit > 0 ? Math.min(100, (outstanding / card.limit) * 100) : 0;
  const daysToDue = (() => {
    const due = new Date(now.getFullYear(), now.getMonth(), card.dueDay);
    if (due < now) due.setMonth(due.getMonth() + 1);
    return Math.ceil((due.getTime() - now.getTime()) / 86400000);
  })();

  return (
    <Card
      className={`cursor-pointer transition-colors ${active ? "border-primary" : "hover:border-primary/40"}`}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{card.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fecha dia {card.closingDay} · vence dia {card.dueDay}
            </p>
          </div>
          <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
            <CreditCardFormDialog
              initial={card}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <ConfirmDelete
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              }
              title="Excluir cartão?"
              description="As compras lançadas neste cartão continuarão salvas, mas o cartão será removido."
              onConfirm={onDelete}
            />
          </div>
        </div>
        <div>
          <Progress value={usagePct} className="h-1.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>Usado {formatBRL(outstanding)}</span>
            <span>Limite {formatBRL(card.limit)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Fatura atual</span>
          <span className="font-medium tabular-nums">{formatBRL(currentInvoice)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Disponível</span>
          <span className="font-medium tabular-nums">{formatBRL(available)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {daysToDue <= 3 && (
            <Badge variant="secondary" className="text-destructive">
              Vence em {daysToDue}d
            </Badge>
          )}
          {usagePct > 70 && (
            <Badge variant="secondary" className="text-warning-foreground">
              Limite acima de 70%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CardInvoicePanel({ card }: { card: CreditCard }) {
  const { items: purchases, remove: removePurchase } = useCardPurchases();
  const { items: payments, add: addPayment, remove: removePayment } = useCardInvoicePayments();
  const { add: addTransaction, remove: removeTransaction } = useTransactions();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const items = invoiceItemsForMonth(purchases, card.id, card.closingDay, cursor.y, cursor.m);
  const total = items.reduce((s, i) => s + i.value, 0);
  const payment = payments.find(
    (p) => p.cardId === card.id && p.year === cursor.y && p.month === cursor.m,
  );

  const shift = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const markPaid = () => {
    const dueDate = new Date(cursor.y, cursor.m, card.dueDay);
    const tzOffset = dueDate.getTimezoneOffset() * 60000;
    const dueDateIso = new Date(dueDate.getTime() - tzOffset).toISOString().slice(0, 10);
    const tx = addTransaction({
      description: `Fatura ${card.name} — ${monthLabel}`,
      type: "Despesa",
      expenseCategory: "Fatura cartão de crédito",
      value: total,
      date: dueDateIso,
      status: "Pago",
    });
    addPayment({
      cardId: card.id,
      year: cursor.y,
      month: cursor.m,
      transactionId: tx.id,
      paidDate: new Date().toISOString().slice(0, 10),
    });
    toast.success("Fatura marcada como paga.");
  };

  const unmarkPaid = () => {
    if (!payment) return;
    removeTransaction(payment.transactionId);
    removePayment(payment.id);
    toast.success("Pagamento da fatura desfeito.");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Fatura — {card.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <CardPurchaseFormDialog
            cardId={card.id}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Nova compra
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total da fatura</p>
            <p className="text-lg font-semibold tabular-nums">{formatBRL(total)}</p>
          </div>
          {payment ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Paga em {formatDate(payment.paidDate)}
              </span>
              <Button variant="ghost" size="sm" onClick={unmarkPaid}>
                Desfazer
              </Button>
            </div>
          ) : (
            <Button onClick={markPaid} disabled={total === 0}>
              Marcar fatura como paga
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma compra nesta fatura.</p>
        ) : (
          <div className="divide-y">
            {items.map(({ purchase, installmentNumber, value }) => (
              <div
                key={`${purchase.id}-${installmentNumber}`}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{purchase.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(purchase.purchaseDate)} · {purchase.category ?? "—"}
                    {purchase.installments > 1 &&
                      ` · parcela ${installmentNumber}/${purchase.installments}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium tabular-nums">{formatBRL(value)}</span>
                  {installmentNumber === 1 && (
                    <ConfirmDelete
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title="Excluir compra?"
                      description="Todas as parcelas desta compra serão removidas."
                      onConfirm={() => {
                        removePurchase(purchase.id);
                        toast.success("Compra excluída.");
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreditCardFormDialog({
  trigger,
  initial,
}: {
  trigger: React.ReactNode;
  initial?: CreditCard;
}) {
  const { add, update } = useCreditCards();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    limit: initial?.limit ?? 0,
    closingDay: initial?.closingDay ?? 5,
    dueDay: initial?.dueDay ?? 12,
    responsible: initial?.responsible ?? "",
  });

  const submit = () => {
    if (!form.name.trim() || !form.limit) {
      toast.error("Preencha nome e limite.");
      return;
    }
    if (initial) {
      update(initial.id, form);
      toast.success("Cartão atualizado.");
    } else {
      add(form);
      toast.success("Cartão cadastrado.");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Nome">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Limite (R$)">
              <Input
                type="number"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
              />
            </F>
            <F label="Responsável (opcional)">
              <Input
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
              />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Dia de fechamento">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.closingDay}
                onChange={(e) => setForm({ ...form, closingDay: Number(e.target.value) })}
              />
            </F>
            <F label="Dia de vencimento">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
              />
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Cadastrar cartão"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardPurchaseFormDialog({ trigger, cardId }: { trigger: React.ReactNode; cardId: string }) {
  const { add } = useCardPurchases();
  const { items: projects } = useProjects();
  const { groups: categoryGroups } = useExpenseCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    category: "",
    projectId: undefined as string | undefined,
    value: 0,
    installments: 1,
    purchaseDate: new Date().toISOString().slice(0, 10),
  });

  const submit = () => {
    if (!form.description.trim() || !form.value) {
      toast.error("Preencha descrição e valor.");
      return;
    }
    add({
      cardId,
      description: form.description,
      category: form.category || undefined,
      projectId: form.projectId,
      value: form.value,
      installments: Math.max(1, Math.min(48, Math.floor(form.installments) || 1)),
      purchaseDate: form.purchaseDate,
    });
    toast.success("Compra lançada.");
    setForm({
      description: "",
      category: "",
      projectId: undefined,
      value: 0,
      installments: 1,
      purchaseDate: new Date().toISOString().slice(0, 10),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova compra no cartão</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Descrição">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Valor total (R$)">
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </F>
            <F label="Parcelas">
              <Input
                type="number"
                min={1}
                max={48}
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
              />
            </F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Data da compra">
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </F>
            <F label="Categoria (opcional)">
              <Select
                value={form.category || "none"}
                onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categoryGroups.map((g) => (
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
            </F>
          </div>
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Lançar compra</Button>
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
