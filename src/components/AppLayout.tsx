import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FolderKanban, Users, ListChecks, Wallet, FileText, Menu, X, LogOut, ShieldCheck, Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";
import { requiredPermission, type Permission } from "@/lib/permissions";
import { EmptyState } from "@/components/PageHeader";


const nav: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; permission?: Permission; adminOnly?: boolean }> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/projects", label: "Projetos", icon: FolderKanban, permission: "projects" },
  { to: "/clients", label: "Clientes", icon: Users, permission: "clients" },
  { to: "/tasks", label: "Tarefas", icon: ListChecks, permission: "tasks" },
  { to: "/financial", label: "Financeiro", icon: Wallet, permission: "financial" },
  { to: "/proposals", label: "Propostas", icon: FileText, permission: "proposals" },
  { to: "/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
];

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground font-bold">
        HG
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-sidebar-foreground">HG Estrutural</div>
          <div className="text-[11px] text-sidebar-foreground/60">Painel do Escritório</div>
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: r => r.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const { user, loading, can } = useAppAuth();
  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleLogout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/login", search: { next: undefined }, replace: true });
  };

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/login", search: { next: undefined }, replace: true });
  }, [loading, user, router]);

  const visibleNav = nav.filter(item => {
    if (item.adminOnly) return !!user?.isAdmin;
    if (item.permission) return can(item.permission);
    return true;
  });

  const needed = requiredPermission(pathname);
  const blocked = !!needed && !!user && !can(needed);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width]",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <Brand collapsed={collapsed} />
        <nav className="flex-1 px-2 space-y-1">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="mx-3 inline-flex items-center justify-center rounded-md border border-sidebar-border/60 px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span className="ml-1">Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="m-3 inline-flex items-center justify-center rounded-md border border-sidebar-border/60 px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <><X className="h-3 w-3 mr-1" /> Recolher</>}
        </button>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {blocked ? (
            <EmptyState
              icon={Lock}
              title="Sem acesso a esta área"
              description="Seu usuário não tem permissão para visualizar esta seção. Fale com o administrador do escritório."
            />
          ) : (
            children
          )}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid" style={{ gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))` }}>
        {visibleNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.to, item.exact);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center py-2 text-[10px] gap-0.5",
                active ? "text-accent" : "text-sidebar-foreground/70",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
