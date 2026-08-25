import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DOC_BUCKET = "project-documents";

export const DOC_KINDS = ["CAD", "PDF", "Imagem", "Contrato"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export interface ProjectDocument {
  id: string;
  project_id: string;
  group_id: string;
  name: string;
  kind: DocKind;
  version: string;
  storage_path: string;
  mime_type: string;
  size: number;
  notes: string | null;
  tags: string[];
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
}

/** Normaliza uma tag: sem "#", minúscula, sem espaços nas pontas. */
export const normalizeTag = (raw: string) =>
  raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase();

export const guessKind = (file: File): DocKind => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["dwg", "dxf", "dwf", "rvt", "ifc", "skp", "stp", "step"].includes(ext)) return "CAD";
  if (file.type.startsWith("image/")) return "Imagem";
  return "PDF";
};

/** v1.0 -> v1.1 (revisão) | v2.0 (nova versão maior) */
export const nextVersion = (current: string | undefined, major: boolean) => {
  const m = /v?(\d+)\.(\d+)/.exec(current ?? "");
  const maj = m ? Number(m[1]) : 1;
  const min = m ? Number(m[2]) : 0;
  if (!m) return "v1.0";
  return major ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
};

export const formatSize = (bytes: number) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export function useProjectDocuments(projectId: string) {
  return useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectDocument[];
    },
  });
}

export type UploadInput = {
  projectId: string;
  file: File;
  kind: DocKind;
  name: string;
  notes?: string;
  /** quando informado, cria uma nova versão desse grupo */
  groupId?: string;
  version: string;
  tags?: string[];
};

export function useUploadDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      const { data: profile } = await supabase
        .from("profiles").select("name, email").eq("id", user.id).maybeSingle();

      const ext = input.file.name.split(".").pop() ?? "bin";
      const path = `${input.projectId}/${crypto.randomUUID()}.${ext}`;

      const up = await supabase.storage.from(DOC_BUCKET).upload(path, input.file, {
        contentType: input.file.type || "application/octet-stream",
        upsert: false,
      });
      if (up.error) throw up.error;

      const { error } = await supabase.from("project_documents").insert({
        project_id: input.projectId,
        group_id: input.groupId ?? crypto.randomUUID(),
        name: input.name || input.file.name,
        kind: input.kind,
        version: input.version,
        storage_path: path,
        mime_type: input.file.type || "application/octet-stream",
        size: input.file.size,
        notes: input.notes ?? null,
        uploaded_by: user.id,
        uploader_name: profile?.name || profile?.email || user.email || "",
      });
      if (error) {
        await supabase.storage.from(DOC_BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-documents", projectId] }); },
  });
}

export function useDeleteDocument(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
      if (error) throw error;
      await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path]);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project-documents", projectId] }); },
  });
}

export function useSignedUrl(path?: string) {
  return useQuery({
    queryKey: ["project-document-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
