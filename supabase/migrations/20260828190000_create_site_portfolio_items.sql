-- Portfólio público do site institucional (Site-versao-3.0). Independente da tabela
-- "projects" (gestão interna de projetos de engenharia): esta tabela alimenta a seção
-- "Projetos" do site público, que qualquer visitante (anônimo) precisa conseguir ler.
CREATE TABLE public.site_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  client text,
  city text,
  uf text,
  area text,
  year text,
  description text NOT NULL,
  about text NOT NULL,
  icon text NOT NULL DEFAULT 'building2',
  image text,
  model_3d_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_portfolio_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_portfolio_items TO authenticated;
GRANT ALL ON public.site_portfolio_items TO service_role;

ALTER TABLE public.site_portfolio_items ENABLE ROW LEVEL SECURITY;

-- Leitura pública: o site institucional lê como visitante anônimo, sem login.
CREATE POLICY site_portfolio_items_select_public ON public.site_portfolio_items
  FOR SELECT TO anon, authenticated USING (true);

-- Escrita restrita a administradores do escritório (mesma regra da área /admin).
CREATE POLICY site_portfolio_items_insert_admin ON public.site_portfolio_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY site_portfolio_items_update_admin ON public.site_portfolio_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY site_portfolio_items_delete_admin ON public.site_portfolio_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Itens de exemplo, para o site não ficar vazio até o escritório cadastrar projetos reais.
INSERT INTO public.site_portfolio_items (slug, title, client, city, uf, area, year, description, about, icon) VALUES
(
  'residencia-unifamiliar',
  'Residência Unifamiliar',
  'Projeto exemplo',
  'Curitiba',
  'PR',
  '420 m²',
  '2025',
  'Estrutura em concreto armado para residência de dois pavimentos.',
  'Projeto estrutural completo em concreto armado, desenvolvido em parceria com o escritório de arquitetura responsável, com foco em vãos livres para as áreas sociais e compatibilização com o paisagismo do terreno.',
  'home'
),
(
  'galpao-logistico',
  'Galpão Logístico',
  'Projeto exemplo',
  'São José dos Pinhais',
  'PR',
  '3.600 m²',
  '2025',
  'Estrutura metálica dimensionada para galpão de uso logístico.',
  'Dimensionamento de estrutura metálica para galpão logístico, incluindo análise de cargas de vento, verificação de estabilidade global e compatibilização com os projetos complementares da obra.',
  'factory'
),
(
  'edificio-comercial',
  'Edifício Comercial',
  'Projeto exemplo',
  'Curitiba',
  'PR',
  '2.100 m²',
  '2024',
  'Projeto estrutural em concreto armado para edifício comercial de múltiplos pavimentos.',
  'Desenvolvimento do projeto estrutural para edifício comercial, com estudo de viabilidade técnica, definição de sistema estrutural e detalhamento completo de formas e armaduras.',
  'building2'
);
