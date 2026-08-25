
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  group_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'PDF',
  version text NOT NULL DEFAULT 'v1.0',
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size bigint NOT NULL DEFAULT 0,
  notes text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_documents_project_idx ON public.project_documents (project_id);
CREATE INDEX project_documents_group_idx ON public.project_documents (group_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_documents_select_authenticated ON public.project_documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY project_documents_insert_own ON public.project_documents
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY project_documents_update_own_or_admin ON public.project_documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY project_documents_delete_own_or_admin ON public.project_documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY project_docs_storage_select ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'project-documents');
CREATE POLICY project_docs_storage_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents' AND owner = auth.uid());
CREATE POLICY project_docs_storage_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'project-documents' AND owner = auth.uid());
CREATE POLICY project_docs_storage_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'project-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
