import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  permissions: Permission[];
};

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useAppAuth() {
  const hydrated = useHydrated();

  const query = useQuery({
    queryKey: ["app-auth"],
    enabled: hydrated,
    queryFn: async (): Promise<AppUser | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }, { data: perms }] = await Promise.all([
        supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_permissions").select("permission").eq("user_id", user.id),
      ]);

      const isAdmin = (roles ?? []).some(r => r.role === "admin");
      return {
        id: user.id,
        email: profile?.email || user.email || "",
        name: profile?.name || user.email || "",
        isAdmin,
        permissions: isAdmin
          ? [...PERMISSIONS]
          : ((perms ?? []).map(p => p.permission).filter(p =>
              (PERMISSIONS as readonly string[]).includes(p),
            ) as Permission[]),
      };
    },
  });

  const user = query.data ?? null;
  return {
    user,
    loading: !hydrated || query.isLoading,
    can: (permission: Permission) => !!user && user.permissions.includes(permission),
  };
}
