"use client";

import { Check, X, Loader2, ClipboardList, ChevronRight } from "lucide-react";
import type { AgentVoorstel } from "../../lib/agent-voorstellen";

const domeinLabel: Record<string, string> = {
  incasso: "Incasso",
  onderhoud: "Onderhoud",
  communicatie: "Communicatie",
  rapportage: "Rapportage",
  contracten: "Contracten",
};

interface Props {
  voorstellen: AgentVoorstel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ApprovalsPanel({ voorstellen, selectedId, onSelect }: Props) {
  const wachtend = voorstellen.filter((v) => v.status === "wachtend");
  const afgehandeld = voorstellen.filter((v) => v.status !== "wachtend");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-primary-400" />
          <span className="text-xs font-medium text-primary-500 uppercase tracking-wider">Goedkeuringen</span>
        </div>
        {wachtend.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-900 px-1.5 text-[10px] font-medium text-white">
            {wachtend.length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {wachtend.length === 0 && afgehandeld.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 mb-3">
              <Check size={14} className="text-primary-500" />
            </div>
            <p className="text-xs text-primary-400">Geen openstaande voorstellen</p>
          </div>
        )}

        {/* Wachtend */}
        {wachtend.length > 0 && (
          <div className="p-2 space-y-1">
            {wachtend.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`w-full rounded-lg border p-2.5 text-left transition-colors ${
                  selectedId === v.id
                    ? "border-primary-400 bg-primary-50"
                    : "border-primary-200 bg-white hover:bg-primary-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[9px] font-medium text-primary-500 uppercase">
                    {domeinLabel[v.domein] ?? v.domein}
                  </span>
                  <ChevronRight size={12} className="text-primary-300" />
                </div>
                <p className="text-xs font-medium text-primary leading-snug">{v.titel}</p>
              </button>
            ))}
          </div>
        )}

        {/* Afgehandeld */}
        {afgehandeld.length > 0 && (
          <div className="px-2 pb-2">
            {wachtend.length > 0 && (
              <div className="border-t border-primary-100 pt-2 mb-1.5 mx-1">
                <p className="text-[10px] font-medium text-primary-400 uppercase tracking-wider mb-1">Afgehandeld</p>
              </div>
            )}
            <div className="space-y-0.5">
              {afgehandeld.map((v) => (
                <div key={v.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                  {v.status === "uitgevoerd" || v.status === "zelf" ? (
                    <Check size={11} className="shrink-0 text-primary-400" />
                  ) : v.status === "goedgekeurd" ? (
                    <Loader2 size={11} className="shrink-0 text-primary-400 animate-spin" />
                  ) : (
                    <X size={11} className="shrink-0 text-primary-300" />
                  )}
                  <p className={`text-[11px] leading-snug truncate ${
                    v.status === "afgewezen" ? "text-primary-300 line-through" : "text-primary-500"
                  }`}>
                    {v.titel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-primary-200 px-4 py-3">
        <p className="text-[10px] text-primary-300">
          Powered by <span className="font-medium text-primary-400">VDM Nexus</span>
        </p>
      </div>
    </div>
  );
}
