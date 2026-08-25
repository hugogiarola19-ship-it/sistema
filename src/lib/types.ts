export type ProjectType = "Unifamiliar" | "Multifamiliar" | "Comercial";
export type ProjectStatus = "Em andamento" | "Aguardando cliente" | "Entregue" | "Arquivado";
export type ClientType = "Arquiteto" | "Construtora" | "Cliente particular" | "Seguradora";
export type TaskStatus = "A fazer" | "Em andamento" | "Concluído";
export type TaskPriority = "Alta" | "Média" | "Baixa";
export type TxType = "Receita" | "Despesa";
export type TxStatus = "Pago" | "Pendente" | "Cancelado";
export type ProposalStatus = "Aberto" | "Aprovado" | "Recusado" | "Expirado";

export type PersonType = "PF" | "PJ";

export interface Client {
  id: string;
  name: string;
  personType: PersonType;
  /** CPF quando PF, CNPJ quando PJ */
  document?: string;
  /** responsável (apenas PJ) */
  responsible?: string;
  /** data de nascimento */
  birthDate?: string;
  type: ClientType;
  phone: string;
  email: string;
  city: string;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  /** proposta vinculada */
  proposalId?: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate: string;
  deadline: string;
  value: number;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  /** id do usuário responsável (profiles.id) */
  assigneeId?: string;
  weekly?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  projectId?: string;
  type: TxType;
  value: number;
  date: string;
  status: TxStatus;
  /** id do grupo de despesas recorrentes mensais */
  recurringId?: string;
  /** categoria da despesa (apenas quando type = Despesa) */
  expenseCategory?: string;
  /** índice da parcela (1-based) quando o lançamento vem do parcelamento de um projeto */
  installment?: number;
}

export interface Proposal {
  id: string;
  clientId: string;
  description: string;
  value: number;
  sentDate: string;
  status: ProposalStatus;
}
