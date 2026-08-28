import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PortfolioIconId = "home" | "building2" | "factory" | "warehouse" | "landmark" | "building";

export type PortfolioItem = {
  id: string;
  slug: string;
  title: string;
  client: string | null;
  city: string | null;
  uf: string | null;
  area: string | null;
  year: string | null;
  description: string;
  about: string;
  icon: PortfolioIconId;
  image: string | null;
  model_3d_url: string | null;
  created_at: string;
};

const QUERY_KEY = ["site-portfolio-items"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function usePortfolioItems() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PortfolioItem[]> => {
      const { data, error } = await supabase
        .from("site_portfolio_items")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as PortfolioItem[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: Omit<PortfolioItem, "id" | "slug" | "created_at">) => {
      const base = slugify(input.title) || "projeto";
      const { data: existing, error: lookupError } = await supabase
        .from("site_portfolio_items")
        .select("slug")
        .like("slug", `${base}%`);
      if (lookupError) throw lookupError;

      const taken = new Set((existing ?? []).map((p) => p.slug));
      let slug = base;
      let i = 2;
      while (taken.has(slug)) slug = `${base}-${i++}`;

      const { error } = await supabase.from("site_portfolio_items").insert({ ...input, slug });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<PortfolioItem, "id" | "slug" | "created_at">>;
    }) => {
      const { error } = await supabase.from("site_portfolio_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_portfolio_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    error: query.error as Error | null,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}

export const PORTFOLIO_ICON_OPTIONS: { id: PortfolioIconId; label: string }[] = [
  { id: "home", label: "Residencial" },
  { id: "building2", label: "Comercial" },
  { id: "factory", label: "Industrial" },
  { id: "warehouse", label: "Galpão" },
  { id: "landmark", label: "Institucional" },
  { id: "building", label: "Edifício" },
];
