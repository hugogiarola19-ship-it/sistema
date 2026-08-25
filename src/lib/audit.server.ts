import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  actorId: string;
  actorName: string;
  action: string;
  targetUserId?: string | null;
  targetName?: string | null;
  details?: string | null;
};

/** Grava uma linha no log de auditoria administrativa (nunca lança). */
export async function logAdminAction(admin: SupabaseClient<any>, entry: AuditEntry) {
  try {
    await admin.from("admin_audit_log").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName ?? "",
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      target_name: entry.targetName ?? "",
      details: entry.details ?? null,
    });
  } catch {
    // auditoria não deve bloquear a operação
  }
}

export async function actorName(admin: SupabaseClient<any>, userId: string) {
  const { data } = await admin.from("profiles").select("name, email").eq("id", userId).maybeSingle();
  return (data?.name as string) || (data?.email as string) || "";
}
