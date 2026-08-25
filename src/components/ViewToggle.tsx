import { useEffect, useState } from "react";
import { List, LayoutGrid, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "lista" | "bloco" | "quadro";

const ICONS: Record<ViewMode, React.ComponentType<{ className?: string }>> = {
  lista: List,
  bloco: LayoutGrid,
  quadro: Columns3,
};

const LABELS: Record<ViewMode, string> = {
  lista: "Lista",
  bloco: "Blocos",
  quadro: "Quadro",
};

/** Modo de visualização persistido por página. */
export function useViewMode(key: string, initial: ViewMode) {
  const storageKey = `hg.view.${key}`;
  const [mode, setMode] = useState<ViewMode>(initial);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (saved === "lista" || saved === "bloco" || saved === "quadro") setMode(saved);
  }, [storageKey]);

  const set = (m: ViewMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(storageKey, m);
    } catch {
      /* ignore */
    }
  };

  return [mode, set] as const;
}

export function ViewToggle({
  value,
  onChange,
  options = ["lista", "bloco"],
}: {
  value: ViewMode;
  onChange: (m: ViewMode) => void;
  options?: ViewMode[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
      {options.map(opt => {
        const Icon = ICONS[opt];
        const active = value === opt;
        return (
          <Button
            key={opt}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={active}
            title={`Visualização em ${LABELS[opt].toLowerCase()}`}
            onClick={() => onChange(opt)}
            className={cn("h-8 px-2.5 gap-1.5", active && "text-primary")}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{LABELS[opt]}</span>
          </Button>
        );
      })}
    </div>
  );
}
