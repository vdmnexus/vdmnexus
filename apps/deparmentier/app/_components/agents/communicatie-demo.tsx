"use client";

import { useReducer, useCallback } from "react";
import { communicatieBroadcasts, type Broadcast } from "./mock-data";
import { Mail, MessageSquare, Send } from "lucide-react";

type State = {
  phase: "idle" | "thinking" | "responding" | "complete";
  broadcasts: Broadcast[];
  generatedMessage: string | null;
  selectedChannels: string[];
};

type Action =
  | { type: "GENERATE" }
  | { type: "SET_MESSAGE"; message: string }
  | { type: "TOGGLE_CHANNEL"; channel: string }
  | { type: "SEND" }
  | { type: "SENT" }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GENERATE":
      return { ...state, phase: "thinking", generatedMessage: null };
    case "SET_MESSAGE":
      return { ...state, phase: "responding", generatedMessage: action.message };
    case "TOGGLE_CHANNEL": {
      const channels = state.selectedChannels.includes(action.channel)
        ? state.selectedChannels.filter((c) => c !== action.channel)
        : [...state.selectedChannels, action.channel];
      return { ...state, selectedChannels: channels };
    }
    case "SEND":
      return { ...state, phase: "thinking" };
    case "SENT":
      return { ...state, phase: "complete" };
    case "RESET":
      return {
        ...state,
        phase: "idle",
        generatedMessage: null,
        selectedChannels: ["email", "slack"],
      };
    default:
      return state;
  }
}

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  whatsapp: Send,
};

const samplePrompt =
  "Schrijf een bericht aan alle huurders over gepland liftonderhoud op zaterdag 29 maart van 09:00 tot 15:00.";

export function CommunicatieDemo() {
  const [state, dispatch] = useReducer(reducer, {
    phase: "idle",
    broadcasts: communicatieBroadcasts,
    generatedMessage: null,
    selectedChannels: ["email", "slack"],
  });

  const handleGenerate = useCallback(() => {
    dispatch({ type: "GENERATE" });

    const message =
      "Beste huurders,\n\nOp zaterdag 29 maart wordt lift A onderhouden van 09:00 tot 15:00. Gedurende deze periode is alleen lift B beschikbaar.\n\nWij adviseren om grote transporten te plannen buiten deze tijden. Voor vragen kunt u contact opnemen met het beheerkantoor.\n\nOnze excuses voor het ongemak.\n\nMet vriendelijke groet,\nBeheer De Parmentier";

    let i = 0;
    const chars = message.split("");
    const interval = setInterval(() => {
      i += 3;
      if (i >= chars.length) {
        clearInterval(interval);
        dispatch({ type: "SET_MESSAGE", message });
      } else {
        dispatch({ type: "SET_MESSAGE", message: chars.slice(0, i).join("") });
      }
    }, 20);
  }, []);

  const handleSend = useCallback(() => {
    dispatch({ type: "SEND" });
    setTimeout(() => dispatch({ type: "SENT" }), 1500);
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-white0 font-medium uppercase tracking-widest">
          Recente berichten
        </p>
        {state.broadcasts.map((b) => (
          <div
            key={b.id}
            className="p-3 bg-white rounded-lg border border-primary-200 text-sm"
          >
            <div className="flex justify-between items-start">
              <p className="font-medium text-primary">{b.subject}</p>
              <div className="flex gap-1">
                {b.channels.map((ch) => {
                  const Icon =
                    channelIcons[ch as keyof typeof channelIcons] || Mail;
                  return (
                    <Icon
                      key={ch}
                      className="w-3.5 h-3.5 text-primary-400"
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-white0 text-xs mt-1">
              {new Date(b.sentAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-primary-900 rounded-xl p-4">
        <p className="text-white text-sm font-semibold mb-3">
          Nieuw bericht genereren
        </p>

        <div className="bg-primary-800 rounded-lg p-3 mb-3">
          <p className="text-primary-300 text-sm">{samplePrompt}</p>
        </div>

        {state.generatedMessage && (
          <div className="bg-primary-800 rounded-lg p-3 mb-3">
            <p className="text-primary-100 text-sm whitespace-pre-line">
              {state.generatedMessage}
            </p>
            {state.phase === "thinking" && state.generatedMessage && (
              <span className="inline-block w-1 h-4 bg-accent animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {state.phase === "responding" && (
          <div className="mb-3">
            <p className="text-white0 text-xs mb-2">Verstuur via:</p>
            <div className="flex gap-2">
              {(["email", "slack", "whatsapp"] as const).map((ch) => {
                const Icon = channelIcons[ch];
                const active = state.selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() =>
                      dispatch({ type: "TOGGLE_CHANNEL", channel: ch })
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? "bg-accent text-white"
                        : "bg-primary-800 text-primary-400 hover:text-primary-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {state.phase === "idle" && (
            <button
              onClick={handleGenerate}
              className="w-full py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-600 transition-colors"
            >
              Genereer bericht
            </button>
          )}
          {state.phase === "thinking" && !state.generatedMessage && (
            <button
              disabled
              className="w-full py-3 bg-primary-800 text-white0 text-sm font-semibold rounded-lg cursor-not-allowed"
            >
              Agent schrijft...
            </button>
          )}
          {state.phase === "responding" && (
            <button
              onClick={handleSend}
              disabled={state.selectedChannels.length === 0}
              className="w-full py-3 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              Verstuur naar {state.selectedChannels.length} kanalen
            </button>
          )}
          {state.phase === "complete" && (
            <>
              <div className="flex-1 py-3 bg-accent-50 text-accent-700 text-sm font-semibold rounded-lg text-center">
                Verstuurd!
              </div>
              <button
                onClick={() => dispatch({ type: "RESET" })}
                className="px-6 py-3 border border-primary-700 text-primary-300 rounded-lg hover:bg-primary-800 transition-colors text-sm"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
