import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";
import { useAppUsers, type AppUserRow } from "@/hooks/useAppUsers";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/lib/permissions";
import { createAppUser, updateAppUser, deleteAppUser } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Giarola Engenharia" },
      {
        name: "description",
        content: "Gerencie usuários do escritório e as áreas que cada um pode acessar.",
      },
      { property: "og:title", content: "Administração — Giarola Engenharia" },
      {
        property: "og:description",
        content: "Gerencie usuários do escritório e as áreas que cada um pode acessar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Row = AppUserRow;

function AdminPage() {
  const { user, loading } = useAppAuth();
  const qc = useQueryClient();
  const { data: users = [] } = useAppUsers();
  const removeUser = useServerFn(deleteAppUser);

  if (loading) return null;
  if (!user?.isAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Acesso restrito"
        description="Somente administradores podem gerenciar usuários e permissões."
      />
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await removeUser({ data: { userId: id } });
      toast.success("Usuário excluído.");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Cadastre usuários e defina a quais áreas do painel cada um tem acesso."
        actions={
          <UserDialog
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Novo usuário
              </Button>
            }
          />
        }
      />

      {users.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Nenhum usuário cadastrado"
          description="Adicione o primeiro funcionário."
        />
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{u.name || u.email}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground/70">
                      {u.isAdmin ? "Administrador" : "Funcionário"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesso:{" "}
                    {u.isAdmin
                      ? "Todas as áreas"
                      : u.permissions.length
                        ? u.permissions.map((p) => PERMISSION_LABELS[p]).join(", ")
                        : "Apenas painel inicial"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <UserDialog
                    initial={u}
                    trigger={
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  {u.id !== user.id && (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(u.id)}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UserDialog({ trigger, initial }: { trigger: React.ReactNode; initial?: Row }) {
  const qc = useQueryClient();
  const create = useServerFn(createAppUser);
  const update = useServerFn(updateAppUser);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(initial?.isAdmin ?? false);
  const [perms, setPerms] = useState<Permission[]>(
    initial?.isAdmin ? [] : (initial?.permissions ?? ["projects", "tasks"]),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (p: Permission) =>
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!initial && (!email.trim() || password.length < 6)) {
      toast.error("Informe e-mail e senha com no mínimo 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await update({
          data: {
            userId: initial.id,
            name,
            isAdmin,
            permissions: perms,
            password: password || undefined,
          },
        });
        toast.success("Usuário atualizado.");
      } else {
        await create({ data: { name, email, password, isAdmin, permissions: perms } });
        toast.success("Usuário criado.");
      }
      qc.invalidateQueries({ queryKey: ["app-users"] });
      setOpen(false);
      setPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome</Label>
            <Input autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label>
            <Input
              type="email"
              autoComplete="off"
              value={email}
              disabled={!!initial}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {initial ? "Nova senha (opcional)" : "Senha"}
            </Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isAdmin} onCheckedChange={(v) => setIsAdmin(v === true)} />
            Administrador (acesso total, inclusive a esta página)
          </label>

          {!isAdmin && (
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Áreas liberadas
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={perms.includes(p)} onCheckedChange={() => toggle(p)} />
                    {PERMISSION_LABELS[p]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {initial ? "Salvar" : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
