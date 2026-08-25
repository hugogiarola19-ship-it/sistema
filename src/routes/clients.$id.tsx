import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { useClients, useProjects, useTasks, projectProgress, formatBRL, formatDate } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { ClientFormDialog } from "@/components/forms/ClientFormDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { items, remove } = useClients();
  const { items: projects } = useProjects();
  const { items: tasks } = useTasks();
  const client = items.find(c => c.id === id);

  if (!client) {
    return (
      <div>
        <Button variant="ghost" asChild><Link to="/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <p className="mt-6 text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  const linked = projects.filter(p => p.clientId === client.id);
  const waLink = `https://wa.me/${client.phone.replace(/\D/g, "")}`;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2"><Link to="/clients"><ArrowLeft className="h-4 w-4 mr-1" /> Clientes</Link></Button>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {client.personType === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"} · {client.type} · {client.city}
          </p>
          {(client.document || client.responsible) && (
            <p className="text-xs text-muted-foreground mt-1">
              {client.document && <>{client.personType === "PJ" ? "CNPJ" : "CPF"}: {client.document}</>}
              {client.responsible && <> · Responsável: {client.responsible}</>}
              {client.birthDate && <> · Nasc.: {formatDate(client.birthDate)}</>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <ClientFormDialog initial={client} trigger={<Button variant="outline"><Pencil className="h-4 w-4 mr-1" /> Editar</Button>} />
          <ConfirmDelete
            trigger={<Button variant="outline"><Trash2 className="h-4 w-4 mr-1 text-destructive" /> Excluir</Button>}
            onConfirm={() => { remove(client.id); toast.success("Cliente excluído."); navigate({ to: "/clients" }); }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            {client.phone && <a className="flex items-center gap-2 hover:text-primary" href={waLink} target="_blank" rel="noreferrer"><Phone className="h-4 w-4" />{client.phone}</a>}
            {client.email && <a className="flex items-center gap-2 hover:text-primary break-all" href={`mailto:${client.email}`}><Mail className="h-4 w-4" />{client.email}</a>}
            {client.notes && <div className="pt-3 border-t mt-3"><p className="text-xs uppercase text-muted-foreground mb-1">Observações</p><p className="whitespace-pre-wrap">{client.notes}</p></div>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Projetos vinculados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {linked.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto vinculado.</p>}
            {linked.map(p => (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="block rounded-lg border p-3 hover:bg-secondary/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.type} · {formatBRL(p.value)} · prazo {formatDate(p.deadline)}</p>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                <Progress value={projectProgress(tasks, p.id)} className="h-1.5 mt-2" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
