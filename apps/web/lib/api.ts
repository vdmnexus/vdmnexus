const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.vdmnexus.com";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("nexus_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Types ───────────────────────────────────────────────

export interface Employee {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  avatar: string | null;
  model: string;
  memoryMode: string;
  soulMemory: string | null;
  personality: {
    tone: number;
    proactivity: number;
    autonomy: number;
  } | null;
  languages: string[];
  channels: string[];
  guardrails: string[] | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  type: string;
  config: unknown;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: string;
}

// ─── Employee API ────────────────────────────────────────

function getUserId(): string {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("nexus_user");
  return raw ? JSON.parse(raw).id : "";
}

export async function getEmployees() {
  return api<Employee[]>(`/employees?userId=${getUserId()}`);
}

export async function getEmployee(id: string) {
  return api<Employee & { skills: { skill: Skill }[]; knowledgeFiles: unknown[] }>(`/employees/${id}`);
}

export async function createEmployee(data: Partial<Employee>) {
  return api<Employee>("/employees", {
    method: "POST",
    body: JSON.stringify({ ...data, userId: getUserId() }),
  });
}

export async function updateEmployee(id: string, data: Partial<Employee>) {
  return api<Employee>(`/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deployEmployee(id: string) {
  return api<{ message: string; employee: Employee }>(`/employees/${id}/deploy`, {
    method: "POST",
  });
}

export async function deleteEmployee(id: string) {
  return api(`/employees/${id}`, { method: "DELETE" });
}

export async function assignSkill(employeeId: string, skillId: string) {
  return api(`/employees/${employeeId}/skills`, {
    method: "POST",
    body: JSON.stringify({ skillId }),
  });
}

// ─── Skills API ──────────────────────────────────────────

export async function getSkills() {
  return api<Skill[]>(`/skills?userId=${getUserId()}`);
}

// ─── Chat API ────────────────────────────────────────────

export async function sendMessage(employeeId: string, message: string, conversationId?: string) {
  return api<{ conversationId: string; message: Message }>(`/chat/${employeeId}`, {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  });
}

export async function getConversationMessages(conversationId: string) {
  return api<Message[]>(`/chat/conversations/${conversationId}/messages`);
}
