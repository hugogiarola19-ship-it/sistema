import { useEffect, useState, useCallback } from "react";
import type {
  Client, Project, Task, Transaction, Proposal,
} from "./types";

const KEYS = {
  clients: "hg.clients",
  projects: "hg.projects",
  tasks: "hg.tasks",
  transactions: "hg.transactions",
  proposals: "hg.proposals",
  expenseCategories: "hg.expenseCategories",
  seeded: "hg.seeded.v2",
} as const;

export const uid = () => Math.random().toString(36).slice(2, 10);

const seed = () => {
  const c1 = { id: "c1", name: "Marina Albuquerque", personType: "PF" as const, document: "012.345.678-90", birthDate: "1986-04-12", type: "Arquiteto" as const, phone: "+5551999990001", email: "marina@studio.arq.br", city: "Porto Alegre", notes: "Parceira recorrente" };
  const c2 = { id: "c2", name: "Construtora Andrade Ltda", personType: "PJ" as const, document: "12.345.678/0001-90", responsible: "Paulo Andrade", birthDate: "1975-09-03", type: "Construtora" as const, phone: "+5551988880002", email: "obras@andrade.com.br", city: "Caxias do Sul", notes: "" };
  const c3 = { id: "c3", name: "Seguros Boa Vista", personType: "PJ" as const, document: "98.765.432/0001-10", responsible: "Helena Braga", birthDate: "1980-01-22", type: "Seguradora" as const, phone: "+5511970000003", email: "sinistros@boavista.com.br", city: "São Paulo", notes: "Laudos de sinistros" };
  const c4 = { id: "c4", name: "Ricardo Mello", personType: "PF" as const, document: "987.654.321-00", birthDate: "1990-11-30", type: "Cliente particular" as const, phone: "+5551977770004", email: "ricardo.mello@gmail.com", city: "Gramado", notes: "" };

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  const projects: Project[] = [
    { id: "p1", name: "Residência Mello — Cálculo Estrutural", clientId: "c4", type: "Unifamiliar", status: "Em andamento", startDate: addDays(-30), deadline: addDays(15), value: 18500, notes: "Sobrado em concreto armado, 2 pavimentos." },
    { id: "p2", name: "Galpão Industrial Andrade — Etapa 2", clientId: "c2", type: "Comercial", status: "Aguardando cliente", startDate: addDays(-60), deadline: addDays(10), value: 42000, notes: "Estrutura metálica, vão livre 24m." },
    { id: "p3", name: "Laudo Técnico — Edifício Aurora", clientId: "c3", type: "Multifamiliar", status: "Em andamento", startDate: addDays(-10), deadline: addDays(20), value: 6800, notes: "Vistoria de fissuras pós-sinistro." },
  ];

  const tasks: Task[] = [
    { id: "t1", title: "Revisar memorial de cálculo — Residência Mello", projectId: "p1", priority: "Alta", status: "Em andamento", dueDate: addDays(2), weekly: true },
    { id: "t2", title: "Enviar ART para o cliente Andrade", projectId: "p2", priority: "Alta", status: "A fazer", dueDate: addDays(1), weekly: true },
    { id: "t3", title: "Reunião com arquiteta Marina", projectId: undefined, priority: "Média", status: "A fazer", dueDate: addDays(3), weekly: true },
    { id: "t4", title: "Vistoria no Edifício Aurora", projectId: "p3", priority: "Alta", status: "Concluído", dueDate: addDays(-2), weekly: true },
    { id: "t5", title: "Emitir nota fiscal — Galpão Etapa 1", projectId: "p2", priority: "Média", status: "Concluído", dueDate: addDays(-5), weekly: false },
  ];

  const transactions: Transaction[] = [
    { id: "x1", description: "Entrada — Residência Mello (40%)", projectId: "p1", type: "Receita", value: 7400, date: addDays(-12), status: "Pago" },
    { id: "x2", description: "Parcela 2 — Galpão Andrade", projectId: "p2", type: "Receita", value: 14000, date: addDays(5), status: "Pendente" },
    { id: "x3", description: "Assinatura software TQS", type: "Despesa", value: 1200, date: addDays(-8), status: "Pago" },
  ];

  const proposals: Proposal[] = [
    { id: "q1", clientId: "c1", description: "Cálculo de laje protendida — Cobertura residencial", value: 12500, sentDate: addDays(-7), status: "Aprovado" },
    { id: "q2", clientId: "c2", description: "Consultoria estrutural — Reforma de galpão", value: 8800, sentDate: addDays(-3), status: "Aberto" },
  ];

  localStorage.setItem(KEYS.clients, JSON.stringify([c1, c2, c3, c4]));
  localStorage.setItem(KEYS.projects, JSON.stringify(projects));
  localStorage.setItem(KEYS.tasks, JSON.stringify(tasks));
  localStorage.setItem(KEYS.transactions, JSON.stringify(transactions));
  localStorage.setItem(KEYS.proposals, JSON.stringify(proposals));
  localStorage.setItem(KEYS.seeded, "1");
};

export const ensureSeed = () => {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(KEYS.seeded)) seed();
};

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function write<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("hg-storage", { detail: key }));
}

function useCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    ensureSeed();
    setItems(read<T>(key));
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail === key) setItems(read<T>(key));
    };
    window.addEventListener("hg-storage", handler);
    return () => window.removeEventListener("hg-storage", handler);
  }, [key]);

  const add = useCallback((item: Omit<T, "id"> & { id?: string }) => {
    const next = read<T>(key);
    const created = { ...item, id: item.id ?? uid() } as T;
    next.unshift(created);
    write(key, next);
    return created;
  }, [key]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const next = read<T>(key).map(i => (i.id === id ? { ...i, ...patch } : i));
    write(key, next);
  }, [key]);

  const remove = useCallback((id: string) => {
    write(key, read<T>(key).filter(i => i.id !== id));
  }, [key]);

  return { items, add, update, remove };
}

export const useClients = () => useCollection<Client>(KEYS.clients);
export const useProjects = () => useCollection<Project>(KEYS.projects);
export const useTasks = () => useCollection<Task>(KEYS.tasks);
export const useTransactions = () => useCollection<Transaction>(KEYS.transactions);
export const useProposals = () => useCollection<Proposal>(KEYS.proposals);

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Anuidade CREA", "Aluguel", "Água", "Luz", "Internet", "Seguro", "Software",
];

export function useExpenseCategories() {
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEYS.expenseCategories);
      setCustom(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { setCustom([]); }
  }, []);

  const addCategory = useCallback((name: string) => {
    const value = name.trim();
    if (!value) return;
    setCustom(prev => {
      const all = [...DEFAULT_EXPENSE_CATEGORIES, ...prev];
      if (all.some(c => c.toLowerCase() === value.toLowerCase())) return prev;
      const next = [...prev, value];
      localStorage.setItem(KEYS.expenseCategories, JSON.stringify(next));
      return next;
    });
  }, []);

  return { categories: [...DEFAULT_EXPENSE_CATEGORIES, ...custom], addCategory };
}

export const projectProgress = (tasks: Task[], projectId: string) => {
  const t = tasks.filter(x => x.projectId === projectId);
  if (t.length === 0) return 0;
  return Math.round((t.filter(x => x.status === "Concluído").length / t.length) * 100);
};

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
};
