import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTFOLIO_ICON_OPTIONS, type PortfolioIconId, type PortfolioItem } from "@/lib/sitePortfolio";
import { toast } from "sonner";

type FormState = {
  title: string;
  client: string;
  city: string;
  uf: string;
  area: string;
  year: string;
  description: string;
  about: string;
  icon: PortfolioIconId;
  image: string;
  model_3d_url: string;
};

const emptyForm: FormState = {
  title: "",
  client: "",
  city: "",
  uf: "",
  area: "",
  year: String(new Date().getFullYear()),
  description: "",
  about: "",
  icon: "building2",
  image: "",
  model_3d_url: "",
};

export function PortfolioItemFormDialog({
  trigger,
  initial,
  onSave,
}: {
  trigger: React.ReactNode;
  initial?: PortfolioItem;
  onSave: (input: Omit<PortfolioItem, "id" | "slug" | "created_at">) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title: initial.title,
          client: initial.client ?? "",
          city: initial.city ?? "",
          uf: initial.uf ?? "",
          area: initial.area ?? "",
          year: initial.year ?? "",
          description: initial.description,
          about: initial.about,
          icon: initial.icon,
          image: initial.image ?? "",
          model_3d_url: initial.model_3d_url ?? "",
        }
      : emptyForm,
  );

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.about.trim()) {
      toast.error("Preencha ao menos título, descrição curta e sobre o projeto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        client: form.client.trim() || null,
        city: form.city.trim() || null,
        uf: form.uf.trim().toUpperCase() || null,
        area: form.area.trim() || null,
        year: form.year.trim() || null,
        description: form.description.trim(),
        about: form.about.trim(),
        icon: form.icon,
        image: form.image.trim() || null,
        model_3d_url: form.model_3d_url.trim() || null,
      });
      toast.success(initial ? "Item atualizado." : "Item adicionado.");
      setOpen(false);
      if (!initial) setForm(emptyForm);
    } catch {
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar item do portfólio" : "Novo item do portfólio"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <F label="Título">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </F>
          <div className="grid grid-cols-2 gap-4">
            <F label="Cliente">
              <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
            </F>
            <F label="Categoria">
              <Select
                value={form.icon}
                onValueChange={(v) => setForm({ ...form, icon: v as PortfolioIconId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <F label="Cidade">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </F>
            <F label="UF">
              <Input
                maxLength={2}
                value={form.uf}
                onChange={(e) => setForm({ ...form, uf: e.target.value })}
              />
            </F>
            <F label="Ano">
              <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </F>
          </div>
          <F label="Área">
            <Input
              placeholder="ex: 420 m²"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
          </F>
          <F label="Descrição curta">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </F>
          <F label="Sobre o projeto">
            <Textarea rows={4} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </F>
          <F label="URL da imagem">
            <Input
              placeholder="https://..."
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </F>
          <F label="URL do modelo 3D">
            <Input
              placeholder="https://..."
              value={form.model_3d_url}
              onChange={(e) => setForm({ ...form, model_3d_url: e.target.value })}
            />
          </F>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : initial ? "Salvar" : "Adicionar"}
          </Button>
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
