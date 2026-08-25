import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listTeamMembersTool from "./tools/list-team-members";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "hg-estrutural-office-hub",
  title: "Giarola Engenharia: Office Hub",
  version: "0.1.0",
  instructions:
    "Ferramentas do painel Giarola Engenharia. Use `whoami` para ver o perfil e as permissões do usuário conectado e `list_team_members` para listar a equipe do escritório.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listTeamMembersTool],
});
