import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewUser = { name: string; email: string; password: string; isAdmin: boolean; permissions: string[] };

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem gerenciar usuários.");
}

/** Cria o primeiro administrador quando ainda não existe nenhum usuário. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) return { ok: false as const, reason: "already" as const };

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário.");

    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      name: data.name.trim(),
      email: created.user.email ?? "",
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    return { ok: true as const };
  });

export const hasAnyUser = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  return { any: (count ?? 0) > 0 };
});

/**
 * Chamada após um login bem-sucedido: bloqueia usuários desativados e
 * registra a data do último acesso.
 */
export const completeLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("active, name")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile && profile.active === false) {
      return { ok: false as const, reason: "inactive" as const };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true as const };
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NewUser) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { actorName, logAdminAction } = await import("@/lib/audit.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário.");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").insert({ id: uid, name: data.name.trim(), email: created.user.email ?? "" });
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.isAdmin ? "admin" : "funcionario" });
    if (!data.isAdmin && data.permissions.length > 0) {
      await supabaseAdmin
        .from("user_permissions")
        .insert(data.permissions.map(p => ({ user_id: uid, permission: p })));
    }

    await logAdminAction(supabaseAdmin as any, {
      actorId: context.userId,
      actorName: await actorName(supabaseAdmin as any, context.userId),
      action: "Criou usuário",
      targetUserId: uid,
      targetName: data.name.trim(),
      details: `${data.isAdmin ? "Administrador" : "Funcionário"}${data.isAdmin ? "" : ` · áreas: ${data.permissions.join(", ") || "nenhuma"}`}`,
    });
    return { ok: true as const, id: uid };
  });

export const updateAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; name: string; isAdmin: boolean; permissions: string[]; password?: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { actorName, logAdminAction } = await import("@/lib/audit.server");

    await supabaseAdmin.from("profiles").update({ name: data.name.trim() }).eq("id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.isAdmin ? "admin" : "funcionario" });

    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);
    if (!data.isAdmin && data.permissions.length > 0) {
      await supabaseAdmin
        .from("user_permissions")
        .insert(data.permissions.map(p => ({ user_id: data.userId, permission: p })));
    }

    let changedPassword = false;
    if (data.password && data.password.length >= 6) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
      if (error) throw new Error(error.message);
      changedPassword = true;
    }

    await logAdminAction(supabaseAdmin as any, {
      actorId: context.userId,
      actorName: await actorName(supabaseAdmin as any, context.userId),
      action: "Editou usuário",
      targetUserId: data.userId,
      targetName: data.name.trim(),
      details: [
        data.isAdmin ? "Administrador" : `Funcionário · áreas: ${data.permissions.join(", ") || "nenhuma"}`,
        changedPassword ? "senha alterada" : null,
      ].filter(Boolean).join(" · "),
    });
    return { ok: true as const };
  });

export const setAppUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; active: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode desativar seu próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { actorName, logAdminAction } = await import("@/lib/audit.server");

    const { error } = await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.userId);
    if (error) throw new Error(error.message);

    const target = await actorName(supabaseAdmin as any, data.userId);
    await logAdminAction(supabaseAdmin as any, {
      actorId: context.userId,
      actorName: await actorName(supabaseAdmin as any, context.userId),
      action: data.active ? "Reativou usuário" : "Desativou usuário",
      targetUserId: data.userId,
      targetName: target,
    });
    return { ok: true as const };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode excluir seu próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { actorName, logAdminAction } = await import("@/lib/audit.server");

    const target = await actorName(supabaseAdmin as any, data.userId);
    const actor = await actorName(supabaseAdmin as any, context.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await logAdminAction(supabaseAdmin as any, {
      actorId: context.userId,
      actorName: actor,
      action: "Excluiu usuário",
      targetUserId: null,
      targetName: target,
    });
    return { ok: true as const };
  });
