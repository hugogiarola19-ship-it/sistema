import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  // Project
  "Em andamento": "bg-primary/10 text-primary border-primary/20",
  "Aguardando cliente": "bg-warning/15 text-warning-foreground border-warning/30",
  "Entregue": "bg-success/15 text-success border-success/30",
  "Arquivado": "bg-muted text-muted-foreground border-border",
  // Tx
  "Pago": "bg-success/15 text-success border-success/30",
  "Pendente": "bg-warning/15 text-warning-foreground border-warning/30",
  "Cancelado": "bg-destructive/10 text-destructive border-destructive/30",
  // Proposal
  "Aberto": "bg-primary/10 text-primary border-primary/20",
  "Aprovado": "bg-success/15 text-success border-success/30",
  "Recusado": "bg-destructive/10 text-destructive border-destructive/30",
  "Expirado": "bg-muted text-muted-foreground border-border",
  // Priority
  "Alta": "bg-destructive/10 text-destructive border-destructive/30",
  "Média": "bg-warning/15 text-warning-foreground border-warning/30",
  "Baixa": "bg-secondary text-secondary-foreground border-border",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", map[value] ?? "", className)}>
      {value}
    </Badge>
  );
}
