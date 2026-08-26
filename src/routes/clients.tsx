import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Plus, Trash2, Pencil, Phone, Mail, MapPin } from "lucide-react";
import { useClients, useProjects } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ViewToggle, useViewMode } from "@/components/ViewToggle";
import { ClientFormDialog } from "@/components/forms/ClientFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clientes — Giarola Engenharia" },
      { name: "description", content: "Cadastro de clientes do escritório." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { items, remove } = useClients();
  const { items: projects } = useProjects();
  const [view, setView] = useViewMode("clients", "bloco");
  const activeCount = (cid: string) =>
    projects.filter(
      (p) =>
        p.clientId === cid && (p.status === "Em andamento" || p.status === "Aguardando cliente"),
    ).length;
  const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Arquitetos, construtoras, seguradoras e clientes particulares."
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <ClientFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Novo cliente
                </Button>
              }
            />
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          action={
            <ClientFormDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-1" /> Criar primeiro cliente
                </Button>
              }
            />
          }
        />
      ) : view === "bloco" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to="/clients/$id"
                      params={{ id: c.id }}
                      title={c.name}
                      className="font-medium hover:text-primary block truncate"
                    >
                      {c.name}
                    </Link>
                    <Badge variant="secondary" className="mt-1">
                      {c.type}
                    </Badge>
                  </div>
                  <div className="flex">
                    <ClientFormDialog
                      initial={c}
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
                      title="Excluir cliente?"
                      onConfirm={() => {
                        remove(c.id);
                        toast.success("Cliente excluído.");
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {c.city && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {c.city}
                    </p>
                  )}
                  {c.phone && (
                    <a
                      className="flex items-center gap-2 hover:text-primary"
                      href={waLink(c.phone)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  )}
                  {c.email && (
                    <a
                      className="flex items-center gap-2 hover:text-primary break-all"
                      href={`mailto:${c.email}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {c.email}
                    </a>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{activeCount(c.id)}</span>{" "}
                  projeto(s) ativo(s)
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {items.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      to="/clients/$id"
                      params={{ id: c.id }}
                      className="font-medium hover:text-primary truncate"
                    >
                      {c.name}
                    </Link>
                    <Badge variant="secondary">{c.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {[c.city, c.phone, c.email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                  <span className="font-medium text-foreground">{activeCount(c.id)}</span> ativo(s)
                </span>
                <div className="flex">
                  <ClientFormDialog
                    initial={c}
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
                    title="Excluir cliente?"
                    onConfirm={() => {
                      remove(c.id);
                      toast.success("Cliente excluído.");
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
