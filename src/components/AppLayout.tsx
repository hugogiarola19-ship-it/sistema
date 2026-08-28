import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ListChecks,
  ListTodo,
  Wallet,
  FileText,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Lock,
  Globe,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/logo-full.png";
import logoIcon from "@/assets/logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/hooks/useAppAuth";
import { requiredPermission, type Permission } from "@/lib/permissions";
import { EmptyState } from "@/components/PageHeader";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  permission?: Permission;
  adminOnly?: boolean;
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/my-tasks", label: "Minhas tarefas", icon: ListTodo, permission: "tasks" },
  { to: "/projects", label: "Projetos", icon: FolderKanban, permission: "projects" },
  { to: "/clients", label: "Clientes", icon: Users, permission: "clients" },
  { to: "/tasks", label: "Quadro de tarefas", icon: ListChecks, permission: "tasks" },
  { to: "/financial", label: "Financeiro", icon: Wallet, permission: "financial" },
  { to: "/proposals", label: "Propostas", icon: FileText, permission: "proposals" },
  { to: "/site-portfolio", label: "Portfólio do Site", icon: Globe, adminOnly: true },
  { to: "/admin", label: "Administração", icon: ShieldCheck, adminOnly: true },
];

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center px-4 py-5">
      {collapsed ? (
        <img src={logoIcon} alt="Giarola Engenharia" className="h-9 w-9 object-contain" />
      ) : (
        <img
          src={logoFull}
          alt="Giarola Engenharia — Engenheiro Estrutural"
          className="h-9 w-auto object-contain"
        />
      )}
    </div>
  );
}

function NavLinks({
  items,
  isActive,
  onNavigate,
}: {
  items: NavItem[];
  isActive: (to: string, exact?: boolean) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to, item.exact);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    if (!loading && !user)
      router.navigate({ to: "/login", search: { next: undefined }, replace: true });
  }, [loading, user, router]);

  useEffect(() => setMobileNavOpen(false), [pathname]);

  const visibleNav = nav.filter((item) => {
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
          {collapsed ? (
            visibleNav.map((item) => {
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
                </Link>
              );
            })
          ) : (
            <NavLinks items={visibleNav} isActive={isActive} />
          )}
        </nav>
        <button
          onClick={handleLogout}
          className="mx-3 inline-flex items-center justify-center rounded-md border border-sidebar-border/60 px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span className="ml-1">Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="m-3 inline-flex items-center justify-center rounded-md border border-sidebar-border/60 px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <>
              <X className="h-3 w-3 mr-1" /> Recolher
            </>
          )}
        </button>
      </aside>

      {/* Top header — mobile */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-sidebar text-sidebar-foreground border-b border-sidebar-border px-3 py-2.5">
        <div className="flex items-center">
          <img
            src={logoFull}
            alt="Giarola Engenharia — Engenheiro Estrutural"
            className="h-7 w-auto object-contain"
          />
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Abrir menu"
              className="inline-flex items-center justify-center rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent/60"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 bg-sidebar text-sidebar-foreground p-0 flex flex-col border-sidebar-border"
          >
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Brand />
            <nav className="flex-1 px-2 space-y-1 mt-2">
              <NavLinks
                items={visibleNav}
                isActive={isActive}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </nav>
            <button
              onClick={handleLogout}
              className="m-3 inline-flex items-center justify-center gap-1 rounded-md border border-sidebar-border/60 px-2 py-1.5 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
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
    </div>
  );
}
