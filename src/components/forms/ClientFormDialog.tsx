import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/lib/storage";
import type { Client, ClientType, PersonType } from "@/lib/types";
import { toast } from "sonner";

const types: ClientType[] = ["Arquiteto", "Construtora", "Cliente particular", "Seguradora"];

export function ClientFormDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Client }) {
  const { add, update } = useClients();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Client, "id">>({
    name: "",
    document: "",
    responsible: "",
    birthDate: "",
    type: "Arquiteto",
    phone: "",
    email: "",
    city: "",
    notes: "",
    ...(initial ?? {}),
    personType: initial?.personType ?? "PF",
  });

  const isPJ = form.personType === "PJ";

  const submit = () => {
    if (!form.name.trim()) { toast.error("Informe o nome."); return; }
    if (isPJ && !form.responsible?.trim()) { toast.error("Informe o responsável."); return; }
    if (initial) { update(initial.id, form); toast.success("Cliente atualizado."); }
    else { add(form); toast.success("Cliente criado."); }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Pessoa">
            <Select value={form.personType} onValueChange={v => setForm({ ...form, personType: v as PersonType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
              </SelectContent>
            </Select>
          </F>

          <F label="Nome"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={isPJ ? "Razão social" : "Nome completo"} /></F>

          <div className="grid grid-cols-2 gap-4">
            <F label={isPJ ? "CNPJ" : "CPF"}>
              <Input value={form.document ?? ""} onChange={e => setForm({ ...form, document: e.target.value })} placeholder={isPJ ? "00.000.000/0000-00" : "000.000.000-00"} />
            </F>
            {isPJ ? (
              <F label="Responsável"><Input value={form.responsible ?? ""} onChange={e => setForm({ ...form, responsible: e.target.value })} /></F>
            ) : (
              <F label="Data de nascimento"><Input type="date" value={form.birthDate ?? ""} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></F>
            )}
          </div>

          {isPJ && (
            <F label="Data de nascimento"><Input type="date" value={form.birthDate ?? ""} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></F>
          )}

          <div className="grid grid-cols-2 gap-4">
            <F label="Tipo">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as ClientType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Cidade"><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></F>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Telefone / WhatsApp"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+5551999990000" /></F>
            <F label="E-mail"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
          </div>
          <F label="Observações"><Textarea rows={3} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></F>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Salvar" : "Criar cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
