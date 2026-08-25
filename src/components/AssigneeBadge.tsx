import { User } from "lucide-react";
import { useAppUsers } from "@/hooks/useAppUsers";

export function AssigneeBadge({ userId }: { userId?: string }) {
  const { data: users = [] } = useAppUsers();
  if (!userId) return null;
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground/70">
      <User className="h-3 w-3" />
      {user.name || user.email}
    </span>
  );
}
