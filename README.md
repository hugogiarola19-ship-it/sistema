# Giarola Engenharia — Painel do Escritório

Sistema de gestão para o escritório de engenharia estrutural Giarola Engenharia: projetos, clientes, tarefas (kanban), financeiro, propostas e documentos, com controle de acesso por usuário.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19 + TypeScript, SSR)
- Tailwind CSS v4
- [shadcn/ui](https://ui.shadcn.com/) (componentes em `src/components/ui`)
- [Supabase](https://supabase.com/) (Postgres + Auth + Storage)
- [bun](https://bun.sh/) como gerenciador de pacotes

## Configuração

1. Instale as dependências:

   ```bash
   bun install
   ```

2. Copie `.env.example` para `.env.local` e preencha as credenciais do seu projeto Supabase (painel do Supabase → Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

3. É necessário um projeto Supabase com o schema definido em `supabase/migrations/`. Você pode vincular este repositório ao seu projeto Supabase existente e aplicar as migrations via [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase link --project-ref <seu-project-ref>
   supabase db push
   ```

4. Rode o servidor de desenvolvimento:

   ```bash
   bun run dev
   ```