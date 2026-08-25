import { useState } from "react";
import { Settings2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTaskFields, sortedFields } from "@/lib/storage";
import type { TaskFieldType } from "@/lib/types";

const TYPE_LABELS: Record<TaskFieldType, string> = {
  text: "Texto",
  number: "Número",
  select: "Lista de opções",
};

export function ManageFieldsDialog() {
  const { items: fieldsRaw, add, remove } = useTaskFields();
  const fields = sortedFields(fieldsRaw);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TaskFieldType>("text");
  const [options, setOptions] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    add({
      name: trimmed,
      type,
      options:
        type === "select"
          ? options
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      order: fields.length,
    });
    setName("");
    setType("text");
    setOptions("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Gerenciar campos">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Campos customizados</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum campo customizado ainda.</p>
          )}
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 border rounded-md p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[f.type]}
                  {f.type === "select" && f.options?.length ? ` · ${f.options.join(", ")}` : ""}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(f.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Novo campo
          </p>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Horas estimadas"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TaskFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as TaskFieldType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "select" && (
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Opções (separadas por vírgula)
              </Label>
              <Input
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Ex.: Baixo, Médio, Alto"
              />
            </div>
          )}
          <Button size="sm" onClick={submit} disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar campo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
