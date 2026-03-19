"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import { getAgentResponse, type AgentResponse } from "../../lib/agent-responses";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

type State = {
  phase: "idle" | "thinking" | "streaming";
  messages: ChatMessage[];
  streamingText: string;
};

type Action =
  | { type: "USER_MESSAGE"; text: string }
  | { type: "STREAM_UPDATE"; text: string }
  | { type: "STREAM_COMPLETE"; text: string }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "USER_MESSAGE":
      return { ...state, phase: "thinking", messages: [...state.messages, { role: "user", text: action.text }], streamingText: "" };
    case "STREAM_UPDATE":
      return { ...state, phase: "streaming", streamingText: action.text };
    case "STREAM_COMPLETE":
      return { ...state, phase: "idle", messages: [...state.messages, { role: "agent", text: action.text }], streamingText: "" };
    case "RESET":
      return { phase: "idle", messages: [], streamingText: "" };
    default:
      return state;
  }
}

export function AgentChat() {
  const [state, dispatch] = useReducer(reducer, { phase: "idle", messages: [], streamingText: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.messages, state.streamingText, state.phase]);

  const handleSend = useCallback((text?: string) => {
    const message = text ?? inputRef.current?.value.trim();
    if (!message || state.phase !== "idle") return;
    if (inputRef.current) inputRef.current.value = "";
    dispatch({ type: "USER_MESSAGE", text: message });

    const thinkDelay = 600 + Math.random() * 600;
    setTimeout(() => {
      const response = getAgentResponse(message);
      let i = 0;
      const chars = response.text.split("");
      const interval = setInterval(() => {
        i += 3;
        if (i >= chars.length) {
          clearInterval(interval);
          dispatch({ type: "STREAM_COMPLETE", text: response.text });
        } else {
          dispatch({ type: "STREAM_UPDATE", text: chars.slice(0, i).join("") });
        }
      }, 20);
    }, thinkDelay);
  }, [state.phase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const empty = state.messages.length === 0 && state.phase === "idle";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-primary-200 px-4 py-3">
        <Bot size={14} className="text-primary-400" />
        <span className="text-xs font-medium text-primary-500 uppercase tracking-wider">Agent</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {empty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 mb-3">
              <Bot size={14} className="text-primary-500" />
            </div>
            <p className="text-xs text-primary-400 leading-relaxed">
              Stel een vraag over je portefeuille, facturen, huurders of onderhoud.
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
              {msg.role === "agent" ? renderMarkdown(msg.text) : msg.text}
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

        {state.phase === "streaming" && (
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-primary-50 text-primary-700 px-3 py-2 rounded-xl rounded-bl-sm text-xs leading-relaxed whitespace-pre-wrap">
              {renderMarkdown(state.streamingText)}
              <span className="inline-block w-0.5 h-3 bg-primary-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
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

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
