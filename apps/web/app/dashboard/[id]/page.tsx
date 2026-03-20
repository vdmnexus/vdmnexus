"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Settings, Trash2, Loader2, Bot } from "lucide-react";
import {
  getEmployee,
  sendMessage,
  sendMessageStream,
  deleteEmployee,
  type Employee,
  type Skill,
  type Message,
} from "../../../lib/api";

interface EmployeeWithRelations extends Employee {
  skills: { skill: Skill }[];
  knowledgeFiles: unknown[];
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "config">("chat");

  // Chat state
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEmployee(id)
      .then(setEmployee)
      .catch(() => router.push("/dashboard"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      // Add empty assistant message for streaming
      let streamStarted = false;
      await sendMessageStream(
        id,
        text,
        conversationId ?? undefined,
        (meta) => {
          setConversationId(meta.conversationId);
          streamStarted = true;
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        },
        (chunk) => {
          setMessages((prev) => {
            const msgs = [...prev];
            const last = msgs[msgs.length - 1];
            if (last && last.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
            }
            return msgs;
          });
        },
        () => setSending(false),
        async (error) => {
          console.error("Stream error:", error);
          // Remove empty streaming message if it was added
          if (streamStarted) {
            setMessages((prev) => prev.slice(0, -1));
          }
          // Fallback to non-streaming
          try {
            const res = await sendMessage(id, text, conversationId ?? undefined);
            setConversationId(res.conversationId);
            setMessages((prev) => [...prev, { role: "assistant", content: res.message.content }]);
          } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: "Er ging iets mis. Probeer het opnieuw." }]);
          }
          setSending(false);
        }
      );
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Er ging iets mis. Probeer het opnieuw." }]);
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Weet je zeker dat je deze employee wilt verwijderen?")) return;
    await deleteEmployee(id);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900" />
      </div>
    );
  }

  if (!employee) return null;

  const personality = employee.personality as { tone: number; proactivity: number; autonomy: number } | null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary-400 hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-sm ${employee.active ? "bg-accent" : "bg-primary-300"}`}>
              {employee.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-primary">{employee.name}</p>
                {employee.active && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Online
                  </span>
                )}
              </div>
              <p className="text-xs text-primary-400">{employee.role ?? "Geen rol"} · {employee.model}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab(tab === "chat" ? "config" : "chat")}
            className={`rounded-lg p-2 transition-colors ${tab === "config" ? "bg-primary-100 text-primary" : "text-primary-400 hover:bg-primary-50"}`}
          >
            <Settings size={16} />
          </button>
          <button onClick={handleDelete} className="rounded-lg p-2 text-primary-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {tab === "chat" ? (
        /* Chat */
        <div className="flex flex-1 flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 mb-3">
                  <Bot size={20} className="text-primary-400" />
                </div>
                <p className="text-sm font-medium text-primary mb-1">Chat met {employee.name}</p>
                <p className="text-xs text-primary-400 max-w-sm">
                  {employee.active
                    ? "Stel een vraag of geef een opdracht."
                    : "Deze employee is nog niet deployed. Deploy eerst via de config."}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary-900 text-white rounded-br-sm"
                    : "bg-primary-100 text-primary rounded-bl-sm"
                }`}>
                  {msg.content}
                  {sending && i === messages.length - 1 && msg.role === "assistant" && msg.content.length > 0 && (
                    <span className="inline-block w-1.5 h-3.5 bg-primary-400 animate-pulse ml-0.5 -mb-0.5 rounded-sm" />
                  )}
                </div>
              </div>
            ))}
            {sending && (messages.length === 0 || messages[messages.length - 1]?.role === "user") && (
              <div className="flex justify-start">
                <div className="bg-primary-100 text-primary-400 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-primary-200 bg-white p-4">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={employee.active ? "Stel een vraag..." : "Deploy eerst om te chatten"}
                disabled={!employee.active || sending}
                className="flex-1 rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary outline-none placeholder:text-primary-400 focus:border-primary-400 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!employee.active || sending || !input.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-900 text-white hover:bg-primary-800 transition-colors disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Config */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-xl border border-primary-200 bg-white divide-y divide-primary-100">
              {[
                { label: "Model", value: employee.model },
                { label: "Geheugen", value: employee.memoryMode === "persistent" ? "Persistent + Context" : "Alleen sessie" },
                { label: "Talen", value: (employee.languages ?? []).map((l: string) => l.toUpperCase()).join(", ") },
                { label: "Kanalen", value: (employee.channels ?? []).join(", ") },
                { label: "Status", value: employee.active ? "Active (deployed)" : "Draft" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between px-4 py-3">
                  <span className="text-sm text-primary-400">{row.label}</span>
                  <span className="text-sm font-medium text-primary">{row.value}</span>
                </div>
              ))}
            </div>

            {employee.soulMemory && (
              <div className="rounded-xl border border-primary-200 bg-white p-4">
                <p className="text-xs font-medium text-primary-400 mb-2">Soul Memory</p>
                <p className="text-sm text-primary leading-relaxed">{employee.soulMemory}</p>
              </div>
            )}

            {personality && (
              <div className="rounded-xl border border-primary-200 bg-white p-4 space-y-3">
                <p className="text-xs font-medium text-primary-400">Persoonlijkheid</p>
                {[
                  { label: "Toon", left: "Formeel", right: "Informeel", value: personality.tone },
                  { label: "Initiatief", left: "Reactief", right: "Proactief", value: personality.proactivity },
                  { label: "Autonomie", left: "Vraagt altijd", right: "Autonoom", value: personality.autonomy },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[11px] text-primary-400 mb-1">
                      <span>{s.left}</span>
                      <span>{s.right}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-primary-100">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {employee.skills.length > 0 && (
              <div className="rounded-xl border border-primary-200 bg-white p-4">
                <p className="text-xs font-medium text-primary-400 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {employee.skills.map((es) => (
                    <span key={es.skill.id} className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      <span className="h-1 w-1 rounded-full bg-accent" />
                      {es.skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {employee.guardrails && (employee.guardrails as string[]).length > 0 && (
              <div className="rounded-xl border border-primary-200 bg-white p-4">
                <p className="text-xs font-medium text-primary-400 mb-2">Guardrails</p>
                <div className="space-y-1.5">
                  {(employee.guardrails as string[]).map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
