"use client";

import { useReducer, useCallback } from "react";
import { receptieConversations, type ChatMessage } from "./mock-data";

type State = {
  phase: "idle" | "thinking" | "responding" | "complete";
  messages: ChatMessage[];
  conversationIndex: number;
  messageIndex: number;
};

type Action =
  | { type: "START" }
  | { type: "THINKING" }
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "COMPLETE" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "START":
      return { ...state, phase: "thinking", messages: [] };
    case "THINKING":
      return { ...state, phase: "thinking" };
    case "ADD_MESSAGE":
      return {
        ...state,
        phase: "responding",
        messages: [...state.messages, action.message],
        messageIndex: state.messageIndex + 1,
      };
    case "COMPLETE":
      return {
        ...state,
        phase: "complete",
        conversationIndex:
          (state.conversationIndex + 1) % receptieConversations.length,
        messageIndex: 0,
      };
    case "RESET":
      return { ...state, phase: "idle", messages: [], messageIndex: 0 };
    default:
      return state;
  }
}

export function ReceptieDemo() {
  const [state, dispatch] = useReducer(reducer, {
    phase: "idle",
    messages: [],
    conversationIndex: 0,
    messageIndex: 0,
  });

  const runConversation = useCallback(() => {
    const conversation = receptieConversations[state.conversationIndex];
    dispatch({ type: "START" });

    let i = 0;
    function next() {
      if (i >= conversation.length) {
        dispatch({ type: "COMPLETE" });
        return;
      }
      const msg = conversation[i];
      const delay = msg.role === "agent" ? 1200 : 600;

      setTimeout(() => {
        if (msg.role === "agent") {
          dispatch({ type: "THINKING" });
          setTimeout(() => {
            dispatch({ type: "ADD_MESSAGE", message: msg });
            i++;
            next();
          }, 800);
        } else {
          dispatch({ type: "ADD_MESSAGE", message: msg });
          i++;
          next();
        }
      }, delay);
    }
    next();
  }, [state.conversationIndex]);

  return (
    <div className="space-y-4">
      <div className="bg-primary-900 rounded-xl p-4 min-h-[320px] flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-primary-800">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
            R
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Receptie Agent</p>
            <p className="text-white0 text-xs">De Parmentier</p>
          </div>
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              state.phase === "idle"
                ? "bg-primary-800 text-white0"
                : state.phase === "complete"
                ? "bg-accent-50 text-accent-700"
                : "bg-accent/20 text-accent-200"
            }`}
          >
            {state.phase === "idle"
              ? "Wachtend"
              : state.phase === "complete"
              ? "Afgerond"
              : "Actief"}
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {state.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-white rounded-br-md"
                    : "bg-primary-800 text-primary-100 rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {state.phase === "thinking" && (
            <div className="flex justify-start">
              <div className="bg-primary-800 text-primary-400 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {state.phase === "idle" || state.phase === "complete" ? (
          <button
            onClick={runConversation}
            className="w-full py-3 bg-primary-900 text-white font-semibold rounded-lg hover:bg-primary-800 transition-colors text-sm"
          >
            {state.phase === "complete" ? "Volgende gesprek" : "Start demo gesprek"}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-3 bg-primary-200 text-white0 font-semibold rounded-lg text-sm cursor-not-allowed"
          >
            Gesprek loopt...
          </button>
        )}
        {state.phase === "complete" && (
          <button
            onClick={() => dispatch({ type: "RESET" })}
            className="px-6 py-3 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
