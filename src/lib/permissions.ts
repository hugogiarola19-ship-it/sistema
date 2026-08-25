export const PERMISSIONS = ["projects", "tasks", "clients", "financial", "proposals"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  projects: "Projetos",
  tasks: "Tarefas",
  clients: "Clientes",
  financial: "Financeiro (valores)",
  proposals: "Propostas",
};

/** Rota -> permissão necessária */
export const ROUTE_PERMISSION: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/projects", permission: "projects" },
  { prefix: "/tasks", permission: "tasks" },
  { prefix: "/clients", permission: "clients" },
  { prefix: "/financial", permission: "financial" },
  { prefix: "/proposals", permission: "proposals" },
];

export function requiredPermission(pathname: string): Permission | null {
  const hit = ROUTE_PERMISSION.find(r => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit ? hit.permission : null;
}
