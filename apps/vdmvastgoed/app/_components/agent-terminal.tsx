"use client";

import { useState } from "react";
import { Terminal, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { agentLogs, chatHistory, type AgentLog } from "../../lib/agent-logs";

const logTypeStyle: Record<AgentLog["type"], string> = {
  info: "text-blue-400",
  actie: "text-green-400",
  beslissing: "text-yellow-400",
  api: "text-purple-400",
  error: "text-red-400",
};

const logTypePrefix: Record<AgentLog["type"], string> = {
  info: "INFO",
  actie: "ACTIE",
  beslissing: "BESLUIT",
  api: "API",
  error: "ERROR",
};

const domeinKleur: Record<string, string> = {
  incasso: "bg-emerald-500/20 text-emerald-400",
  onderhoud: "bg-orange-500/20 text-orange-400",
  communicatie: "bg-blue-500/20 text-blue-400",
  rapportage: "bg-purple-500/20 text-purple-400",
  contracten: "bg-rose-500/20 text-rose-400",
};

export function AgentTerminal() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"logs" | "history">("logs");

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
        expanded ? "h-[45vh]" : "h-10"
      }`}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-primary-900 px-4 py-2 text-xs"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Terminal size={13} className="text-primary-400" />
            <span className="font-medium text-primary-300">Agent Logs</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setTab("logs"); }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                tab === "logs" ? "bg-primary-700 text-white" : "text-primary-500 hover:text-primary-300"
              }`}
            >
              Terminal
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setTab("history"); }}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                tab === "history" ? "bg-primary-700 text-white" : "text-primary-500 hover:text-primary-300"
              }`}
            >
              Chat history
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="text-[10px]">Online</span>
          </span>
          {expanded ? <ChevronDown size={14} className="text-primary-400" /> : <ChevronUp size={14} className="text-primary-400" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="h-[calc(100%-2.5rem)] overflow-y-auto bg-primary-950 font-mono">
          {tab === "logs" ? (
            <div className="p-3 space-y-0.5">
              {agentLogs.map((log) => (
                <div key={log.id} className="flex gap-2 text-[11px] leading-relaxed">
                  <span className="shrink-0 text-primary-600 w-36">{log.timestamp}</span>
                  <span className={`shrink-0 w-16 font-medium ${logTypeStyle[log.type]}`}>
                    [{logTypePrefix[log.type]}]
                  </span>
                  <span className="text-primary-300">{log.bericht}</span>
                </div>
              ))}
              <div className="flex gap-2 text-[11px] leading-relaxed mt-2">
                <span className="text-primary-600">_</span>
                <span className="w-1 h-3.5 bg-green-400 animate-pulse inline-block" />
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {chatHistory.map((item) => (
                <div key={item.id} className="rounded-lg bg-primary-900 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] text-primary-500">{item.timestamp}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${domeinKleur[item.domein] ?? "bg-primary-700 text-primary-300"}`}>
                      {item.domein}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 text-[10px] font-medium text-accent mt-0.5">JIJ</span>
                      <p className="text-xs text-primary-200">{item.vraag}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-medium text-green-400 mt-0.5">AGENT</span>
                    <p className="text-xs text-primary-400 leading-relaxed">{item.antwoord}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
