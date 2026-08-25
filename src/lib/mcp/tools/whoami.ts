import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Meu acesso",
  description:
    "Retorna o perfil do usuário conectado (nome, e-mail), se é administrador e quais áreas do painel ele pode acessar.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [profile, roles, perms] = await Promise.all([
      supabase.from("profiles").select("id, name, email").eq("id", userId!).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId!),
      supabase.from("user_permissions").select("permission").eq("user_id", userId!),
    ]);

    const error = profile.error ?? roles.error ?? perms.error;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const isAdmin = (roles.data ?? []).some(r => r.role === "admin");
    const result = {
      id: userId,
      name: profile.data?.name ?? null,
      email: profile.data?.email ?? ctx.getUserEmail() ?? null,
      isAdmin,
      permissions: isAdmin
        ? ["projects", "tasks", "clients", "financial", "proposals"]
        : (perms.data ?? []).map(p => p.permission),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
