import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { useHydrated } from "@/hooks/useAppAuth";

export type AppUserRow = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  permissions: Permission[];
};

export function useAppUsers() {
  const hydrated = useHydrated();
  return useQuery({
    queryKey: ["app-users"],
    enabled: hydrated,
    queryFn: async (): Promise<AppUserRow[]> => {
      const [{ data: profiles }, { data: roles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("id, name, email").order("name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_permissions").select("user_id, permission"),
      ]);
      return (profiles ?? []).map(p => {
        const isAdmin = (roles ?? []).some(r => r.user_id === p.id && r.role === "admin");
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          isAdmin,
          permissions: isAdmin
            ? [...PERMISSIONS]
            : ((perms ?? []).filter(x => x.user_id === p.id).map(x => x.permission) as Permission[]),
        };
      });
    },
  });
}
