import { createFileRoute } from "@tanstack/react-router";
import { Globe, Plus, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { PortfolioItemFormDialog } from "@/components/forms/PortfolioItemFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { usePortfolioItems, PORTFOLIO_ICON_OPTIONS } from "@/lib/sitePortfolio";
import { useAppAuth } from "@/hooks/useAppAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/site-portfolio")({
  head: () => ({
    meta: [
      { title: "Portfólio do Site — Giarola Engenharia" },
      { name: "description", content: "Projetos exibidos no site público do escritório." },
    ],
  }),
  component: SitePortfolioPage,
});

function iconLabel(icon: string) {
  return PORTFOLIO_ICON_OPTIONS.find((o) => o.id === icon)?.label ?? icon;
}

function SitePortfolioPage() {
  const { user, loading: authLoading } = useAppAuth();
  const { items, loading, error, add, update, remove } = usePortfolioItems();

  if (authLoading) return null;
  if (!user?.isAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Sem acesso a esta área"
        description="Só administradores podem gerenciar o portfólio do site público."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Portfólio do Site"
        description="Projetos exibidos no site público do escritório (giarolaengenharia)."
        actions={
          <PortfolioItemFormDialog
            onSave={(input) => add(input)}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Novo item
              </Button>
            }
          />
        }
      />

      {error && (
        <p className="mb-4 text-sm text-destructive">
          Não foi possível carregar os itens do portfólio. Tente recarregar a página.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Nenhum item no portfólio ainda"
          action={
            <PortfolioItemFormDialog
              onSave={(input) => add(input)}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeiro item
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" title={item.title}>
                      {item.title}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {iconLabel(item.icon)}
                    </Badge>
                  </div>
                  <div className="flex shrink-0">
                    <PortfolioItemFormDialog
                      initial={item}
                      onSave={(input) => update({ id: item.id, patch: input })}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <ConfirmDelete
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                      title="Remover item do portfólio?"
                      description="O item deixa de aparecer no site público imediatamente."
                      onConfirm={() => {
                        remove(item.id).then(() => toast.success("Item removido."));
                      }}
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                <p className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  {[item.city && item.uf ? `${item.city}/${item.uf}` : item.city, item.year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
