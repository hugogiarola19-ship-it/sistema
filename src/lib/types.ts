export type ProjectType = "Unifamiliar" | "Multifamiliar" | "Comercial";
export type ProjectStatus = "Em andamento" | "Aguardando cliente" | "Entregue" | "Arquivado";
export type ClientType = "Arquiteto" | "Construtora" | "Cliente particular" | "Seguradora";
export type TaskPriority = "Alta" | "Média" | "Baixa";
export type TxType = "Receita" | "Despesa" | "Investimento" | "Pró-labore";
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
  /** data em que o cliente foi cadastrado, usada para calcular custo de aquisição (CAC) */
  createdAt?: string;
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

/** Coluna do quadro de tarefas. Livremente criável/renomeável pelo usuário, como no Asana. */
export interface TaskSection {
  id: string;
  name: string;
  order: number;
  /** tarefas nesta seção contam como concluídas (progresso, checklist, "Minhas tarefas") */
  isDone: boolean;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId?: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type TaskFieldType = "text" | "number" | "select";

/** Campo customizado de tarefa, definido pelo usuário (como Custom Fields no ClickUp). */
export interface TaskFieldDef {
  id: string;
  name: string;
  type: TaskFieldType;
  /** opções disponíveis, apenas quando type === "select" */
  options?: string[];
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  dueDate?: string;
  priority: TaskPriority;
  sectionId: string;
  /** id do usuário responsável (profiles.id) */
  assigneeId?: string;
  weekly?: boolean;
  /** valores dos campos customizados, chaveados por TaskFieldDef.id */
  customFields?: Record<string, string | number>;
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
  /** categoria da receita (apenas quando type = Receita) */
  revenueCategory?: string;
  /** categoria do investimento (apenas quando type = Investimento) */
  investmentCategory?: string;
  /** meio de recebimento (apenas quando type = Receita): Pix, Boleto, Transferência, etc. */
  paymentMethod?: string;
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
  /** nome do arquivo PDF anexado */
  pdfName?: string;
  /** conteúdo do PDF anexado, como data URL (base64) */
  pdfDataUrl?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  /** dia do mês em que a fatura fecha (1-31) */
  closingDay: number;
  /** dia do mês em que a fatura vence (1-31) */
  dueDay: number;
  responsible?: string;
}

export interface CardPurchase {
  id: string;
  cardId: string;
  description: string;
  category?: string;
  projectId?: string;
  /** valor total da compra (soma de todas as parcelas) */
  value: number;
  /** número total de parcelas (1 = à vista) */
  installments: number;
  purchaseDate: string;
}

/** Registro de que a fatura de um cartão, num mês/ano específico, foi paga. */
export interface CardInvoicePayment {
  id: string;
  cardId: string;
  year: number;
  /** 0-11 */
  month: number;
  /** id do lançamento de Despesa criado ao marcar a fatura como paga */
  transactionId: string;
  paidDate: string;
}
