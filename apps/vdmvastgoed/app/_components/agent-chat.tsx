"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import { sendChatMessage } from "../../lib/api";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

type State = {
  phase: "idle" | "thinking";
  messages: ChatMessage[];
  conversationId: string | null;
};

type Action =
  | { type: "USER_MESSAGE"; text: string }
  | { type: "AGENT_RESPONSE"; text: string; conversationId: string }
  | { type: "ERROR"; text: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "USER_MESSAGE":
      return { ...state, phase: "thinking", messages: [...state.messages, { role: "user", text: action.text }] };
    case "AGENT_RESPONSE":
      return { ...state, phase: "idle", conversationId: action.conversationId, messages: [...state.messages, { role: "agent", text: action.text }] };
    case "ERROR":
      return { ...state, phase: "idle", messages: [...state.messages, { role: "agent", text: action.text }] };
    default:
      return state;
  }
}

export function AgentChat() {
  const [state, dispatch] = useReducer(reducer, { phase: "idle", messages: [], conversationId: null });
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.messages, state.phase]);

  const handleSend = useCallback(async (text?: string) => {
    const message = text ?? inputRef.current?.value.trim();
    if (!message || state.phase !== "idle") return;
    if (inputRef.current) inputRef.current.value = "";
    dispatch({ type: "USER_MESSAGE", text: message });

    try {
      const res = await sendChatMessage(message, state.conversationId ?? undefined);
      dispatch({ type: "AGENT_RESPONSE", text: res.message.content, conversationId: res.conversationId });
    } catch {
      dispatch({ type: "ERROR", text: "Er ging iets mis. Probeer het opnieuw." });
    }
  }, [state.phase, state.conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const empty = state.messages.length === 0 && state.phase === "idle";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-primary-200 px-4 py-3">
        <Bot size={14} className="text-primary-400" />
        <span className="text-xs font-medium text-primary-500 uppercase tracking-wider">Sophie</span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] text-green-600">Online</span>
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {empty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 mb-3">
              <Bot size={14} className="text-primary-500" />
            </div>
            <p className="text-xs text-primary-400 leading-relaxed">
              Vraag Sophie over facturen, huurders, panden, onderhoud of contracten.
            </p>
          </div>
        )}

        {state.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary-900 text-white rounded-br-sm"
                : "bg-primary-50 text-primary-700 rounded-bl-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {state.phase === "thinking" && (
          <div className="flex justify-start">
            <div className="bg-primary-50 text-primary-400 px-3 py-2 rounded-xl rounded-bl-sm text-xs">
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-primary-200 p-2">
        <div className="flex gap-1.5">
          <input
            ref={inputRef}
            type="text"
            placeholder="Stel een vraag..."
            className="flex-1 rounded-lg border border-primary-200 bg-white px-3 py-2 text-xs text-primary outline-none placeholder:text-primary-400 focus:border-primary-400"
            onKeyDown={handleKeyDown}
            disabled={state.phase !== "idle"}
          />
          <button
            onClick={() => handleSend()}
            disabled={state.phase !== "idle"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-900 text-white transition-colors hover:bg-primary-800 disabled:opacity-40"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
