import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin, hasAnyUser } from "@/lib/admin.functions";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Giarola Engenharia" },
      {
        name: "description",
        content: "Acesso restrito ao painel de gestão do escritório Giarola Engenharia.",
      },
      { property: "og:title", content: "Entrar — Giarola Engenharia" },
      {
        property: "og:description",
        content: "Acesso restrito ao painel de gestão do escritório Giarola Engenharia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

/** Only same-origin relative paths are accepted as a post-login destination. */
function safeNext(next?: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function LoginPage() {
  const router = useRouter();
  const { next } = Route.useSearch();
  const checkUsers = useServerFn(hasAnyUser);
  const createFirstAdmin = useServerFn(bootstrapAdmin);

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUsers()
      .then((r) => setNeedsSetup(!r.any))
      .catch(() => setNeedsSetup(false));
  }, [checkUsers]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (needsSetup) {
        await createFirstAdmin({ data: { name, email, password } });
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError("E-mail ou senha inválidos.");
        return;
      }
      await router.invalidate();
      const target = safeNext(next);
      if (target) {
        window.location.href = target;
        return;
      }
      await router.navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center gap-3">
          <img src={logoIcon} alt="Hugo Giarola" className="h-10 w-10 object-contain" />
          <div className="leading-tight">
            <h1 className="text-base font-semibold text-foreground">Hugo Giarola</h1>
            <p className="text-xs text-muted-foreground">Engenheiro Estrutural</p>
          </div>
        </div>

        {needsSetup && (
          <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
            Primeiro acesso: crie a conta de administrador do escritório.
          </p>
        )}

        {needsSetup && (
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading || needsSetup === null}>
          {loading ? "Entrando..." : needsSetup ? "Criar administrador e entrar" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
