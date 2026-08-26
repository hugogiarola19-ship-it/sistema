import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus, Trash2, FileDown } from "lucide-react";
import { useClients, useProposals, formatBRL, formatDate } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";
import type { Proposal, ProposalStatus } from "@/lib/types";

export const Route = createFileRoute("/proposals")({
  head: () => ({
    meta: [
      { title: "Propostas — Giarola Engenharia" },
      { name: "description", content: "Propostas e orçamentos enviados." },
    ],
  }),
  component: ProposalsPage,
});

function ProposalsPage() {
  const { items, remove, update } = useProposals();
  const { items: clients } = useClients();
  const [view, setView] = useViewMode("proposals", "lista");
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Acompanhe orçamentos enviados e suas respostas."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <ProposalFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Nova proposta
                </Button>
              }
            />
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma proposta cadastrada"
          action={
            <ProposalFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeira proposta
                </Button>
              }
            />
          }
        />
      ) : (
        <div
          className={view === "bloco" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}
        >
          {items.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 sm:p-5">
                <div
                  className={
                    view === "bloco"
                      ? "flex flex-col gap-3"
                      : "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{clientName(p.clientId)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Enviada em {formatDate(p.sentDate)} · {formatBRL(p.value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={p.status}
                      onValueChange={(v) => {
                        update(p.id, { status: v as ProposalStatus });
                        toast.success("Status atualizado.");
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["Aberto", "Aprovado", "Recusado", "Expirado"] as ProposalStatus[]).map(
                          (s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" disabled title="Exportar PDF — em breve">
                      <FileDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <ConfirmDelete
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title="Excluir proposta?"
                      onConfirm={() => {
                        remove(p.id);
                        toast.success("Proposta excluída.");
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const { add } = useProposals();
  const { items: clients } = useClients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Proposal, "id">>({
    clientId: clients[0]?.id ?? "",
    description: "",
    value: 0,
    sentDate: new Date().toISOString().slice(0, 10),
    status: "Aberto",
  });

  const submit = () => {
    if (!form.clientId || !form.description.trim() || !form.value) {
      toast.error("Preencha cliente, descrição e valor.");
      return;
    }
    add(form);
    toast.success("Proposta criada.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova proposta</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Cliente">
            <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <F label="Descrição do projeto">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </F>
          <div className="grid grid-cols-3 gap-4">
            <F label="Valor (R$)">
              <Input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </F>
            <F label="Data de envio">
              <Input
                type="date"
                value={form.sentDate}
                onChange={(e) => setForm({ ...form, sentDate: e.target.value })}
              />
            </F>
            <F label="Status">
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as ProposalStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Aberto", "Aprovado", "Recusado", "Expirado"] as ProposalStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Criar proposta</Button>
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
