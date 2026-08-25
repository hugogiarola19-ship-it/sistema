import { useMemo, useState } from "react";
import {
  FileText, Image as ImageIcon, PenTool, FileSignature, Plus, Trash2, Download, History, FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { formatDate } from "@/lib/storage";
import {
  formatSize, useDeleteDocument, useProjectDocuments, useSignedUrl,
  type DocKind, type ProjectDocument,
} from "@/lib/documents";
import { toast } from "sonner";

const kindIcon = (kind: DocKind) =>
  kind === "Imagem" ? ImageIcon : kind === "CAD" ? PenTool : kind === "Contrato" ? FileSignature : FileText;

export function ProjectDocuments({ projectId }: { projectId: string }) {
  const { data: docs = [], isLoading } = useProjectDocuments(projectId);
  const remove = useDeleteDocument(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ProjectDocument[]>();
    for (const d of docs) {
      const list = map.get(d.group_id) ?? [];
      list.push(d);
      map.set(d.group_id, list);
    }
    return [...map.values()].map(list =>
      [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }, [docs]);

  const selected = docs.find(d => d.id === selectedId) ?? groups[0]?.[0] ?? null;
  const history = selected ? groups.find(g => g[0].group_id === selected.group_id) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {docs.length} arquivo{docs.length === 1 ? "" : "s"} · {groups.length} documento{groups.length === 1 ? "" : "s"}
        </p>
        <DocumentUploadDialog
          projectId={projectId}
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo arquivo</Button>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Arquivos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!isLoading && groups.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
              </div>
            )}
            {groups.map(group => {
              const latest = group[0];
              const Icon = kindIcon(latest.kind);
              const active = selected?.group_id === latest.group_id;
              return (
                <button
                  key={latest.group_id}
                  onClick={() => setSelectedId(latest.id)}
                  className={`w-full text-left flex items-start gap-3 rounded-md border p-2.5 transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{latest.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {latest.kind} · {latest.version} · {formatSize(latest.size)}
                    </p>
                  </div>
                  {group.length > 1 && <Badge variant="secondary" className="shrink-0">{group.length}v</Badge>}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{selected.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selected.kind} · {selected.version} · {formatSize(selected.size)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DocumentUploadDialog
                    projectId={projectId}
                    group={{ groupId: selected.group_id, name: selected.name, kind: selected.kind, currentVersion: selected.version }}
                    trigger={<Button size="sm" variant="outline"><History className="h-4 w-4 mr-1" /> Nova versão</Button>}
                  />
                  <ConfirmDelete
                    trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    title="Excluir arquivo?"
                    description={`${selected.name} (${selected.version}) será removido definitivamente.`}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(selected);
                        setSelectedId(null);
                        toast.success("Arquivo excluído.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <DocumentPreview doc={selected} />
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <Info label="Autor" value={selected.uploader_name || "—"} />
                  <Info label="Enviado em" value={formatDate(selected.created_at)} />
                  <Info label="Versão" value={selected.version} />
                </div>
                {selected.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Histórico de versões</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {history.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    className={`w-full text-left flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm ${v.id === selected.id ? "border-primary bg-primary/5" : "hover:bg-muted/60"}`}
                  >
                    <span className="font-medium">{v.version}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {v.uploader_name || "—"} · {formatDate(v.created_at)} · {formatSize(v.size)}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Selecione um arquivo para visualizar.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function DocumentPreview({ doc }: { doc: ProjectDocument }) {
  const { data: url, isLoading } = useSignedUrl(doc.storage_path);
  const isImage = doc.mime_type.startsWith("image/") || doc.kind === "Imagem";
  const isPdf = doc.mime_type === "application/pdf" || /\.pdf$/i.test(doc.storage_path);

  if (isLoading) return <div className="h-64 rounded-md bg-muted animate-pulse" />;
  if (!url) return <p className="text-sm text-muted-foreground">Pré-visualização indisponível.</p>;

  return (
    <div className="space-y-3">
      {isImage ? (
        <img src={url} alt={doc.name} className="w-full max-h-[420px] object-contain rounded-md border bg-muted" />
      ) : isPdf ? (
        <iframe src={url} title={doc.name} className="w-full h-[420px] rounded-md border bg-muted" />
      ) : (
        <div className="rounded-md border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          Pré-visualização não disponível para arquivos {doc.kind}. Faça o download para abrir.
        </div>
      )}
      <Button asChild variant="outline" size="sm">
        <a href={url} download={doc.name} target="_blank" rel="noreferrer"><Download className="h-4 w-4 mr-1" /> Baixar</a>
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
