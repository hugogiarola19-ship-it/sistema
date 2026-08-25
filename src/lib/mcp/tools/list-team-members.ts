import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_team_members",
  title: "Listar equipe",
  description:
    "Lista os usuários do escritório (nome, e-mail, se é administrador e áreas liberadas). Visível conforme as permissões do usuário conectado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [profiles, roles, perms] = await Promise.all([
      supabase.from("profiles").select("id, name, email").order("name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_permissions").select("user_id, permission"),
    ]);

    const error = profiles.error ?? roles.error ?? perms.error;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const members = (profiles.data ?? []).map(p => {
      const isAdmin = (roles.data ?? []).some(r => r.user_id === p.id && r.role === "admin");
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        isAdmin,
        permissions: isAdmin
          ? ["projects", "tasks", "clients", "financial", "proposals"]
          : (perms.data ?? []).filter(x => x.user_id === p.id).map(x => x.permission),
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
      structuredContent: { members },
    };
  },
});
