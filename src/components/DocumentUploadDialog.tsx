import { useRef, useState } from "react";
import { UploadCloud, FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DOC_KINDS, formatSize, guessKind, nextVersion, useUploadDocument, type DocKind } from "@/lib/documents";

type Props = {
  projectId: string;
  trigger: React.ReactNode;
  /** ao enviar nova versão de um arquivo existente */
  group?: { groupId: string; name: string; kind: DocKind; currentVersion: string };
};

export function DocumentUploadDialog({ projectId, trigger, group }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(group?.name ?? "");
  const [kind, setKind] = useState<DocKind>(group?.kind ?? "PDF");
  const [version, setVersion] = useState(group ? nextVersion(group.currentVersion, false) : "v1.0");
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(projectId);

  const pick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    if (!group) {
      setKind(guessKind(f));
      if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const reset = () => {
    setFile(null); setNotes("");
    setName(group?.name ?? ""); setKind(group?.kind ?? "PDF");
    setVersion(group ? nextVersion(group.currentVersion, false) : "v1.0");
  };

  const submit = async () => {
    if (!file) return toast.error("Selecione um arquivo.");
    if (!/^v?\d+\.\d+$/.test(version.trim())) return toast.error("Versão inválida. Use o formato v1.0.");
    try {
      await upload.mutateAsync({
        projectId, file, kind,
        name: name.trim() || file.name,
        notes: notes.trim() || undefined,
        groupId: group?.groupId,
        version: version.trim().startsWith("v") ? version.trim() : `v${version.trim()}`,
      });
      toast.success(group ? `Nova versão ${version} enviada.` : "Arquivo enviado.");
      setOpen(false); reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio do arquivo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? `Nova versão — ${group.name}` : "Novo arquivo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          >
            <UploadCloud className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
            {file ? (
              <p className="text-sm font-medium break-all">{file.name} <span className="text-muted-foreground font-normal">· {formatSize(file.size)}</span></p>
            ) : (
              <>
                <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar (CAD, PDF, imagens, contratos)</p>
              </>
            )}
            <input ref={inputRef} type="file" className="hidden" onChange={e => pick(e.target.files?.[0] ?? null)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Planta de formas" disabled={!!group} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={v => setKind(v as DocKind)} disabled={!!group}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Versão</Label>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.0" />
              {group && (
                <div className="flex gap-2 mt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setVersion(nextVersion(group.currentVersion, false))}>
                    Revisão {nextVersion(group.currentVersion, false)}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVersion(nextVersion(group.currentVersion, true))}>
                    Maior {nextVersion(group.currentVersion, true)}
                  </Button>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="O que mudou nesta versão?" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upload.isPending}>
            <FileUp className="h-4 w-4 mr-1" /> {upload.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
