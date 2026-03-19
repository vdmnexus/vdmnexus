"use client";

import { Check, X, Download, Send, ArrowUpRight, Plus, Loader2 } from "lucide-react";
import type { AgentVoorstel, VoorstelActie } from "../../lib/agent-voorstellen";

const actieConfig: Record<VoorstelActie, { label: string; icon: typeof Send }> = {
  verstuur: { label: "Verstuur", icon: Send },
  download: { label: "Download", icon: Download },
  aanmaken: { label: "Aanmaken", icon: Plus },
  verlengen: { label: "Verstuur voorstel", icon: Send },
  escaleer: { label: "Escaleer", icon: ArrowUpRight },
};

interface Props {
  voorstel: AgentVoorstel;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function VoorstelCard({ voorstel, onApprove, onReject }: Props) {
  const actie = actieConfig[voorstel.actie];
  const ActieIcon = actie.icon;
  const isWachtend = voorstel.status === "wachtend";

  return (
    <div className="rounded-xl border border-primary-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-medium text-primary">{voorstel.titel}</p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
          voorstel.status === "wachtend"
            ? "bg-primary-100 text-primary-600"
            : voorstel.status === "uitgevoerd"
              ? "bg-primary-900/10 text-primary-700"
              : voorstel.status === "goedgekeurd"
                ? "bg-primary-100 text-primary-600"
                : "bg-primary-100 text-primary-400"
        }`}>
          {voorstel.status === "wachtend" ? "Wacht op goedkeuring"
            : voorstel.status === "uitgevoerd" ? "Uitgevoerd"
            : voorstel.status === "goedgekeurd" ? "Goedgekeurd"
            : "Afgewezen"}
        </span>
      </div>
      <p className="text-xs text-primary-400 leading-relaxed">{voorstel.beschrijving}</p>

      {isWachtend && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onApprove(voorstel.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-800"
          >
            <ActieIcon size={12} />
            {actie.label}
          </button>
          <button
            onClick={() => onReject(voorstel.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-medium text-primary-500 transition-colors hover:bg-primary-50"
          >
            <X size={12} />
            Afwijzen
          </button>
        </div>
      )}

      {voorstel.status === "goedgekeurd" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary-500">
          <Loader2 size={13} className="animate-spin" />
          <span>Wordt uitgevoerd...</span>
        </div>
      )}

      {voorstel.status === "uitgevoerd" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-primary-600">
          <Check size={13} />
          <span className="font-medium">Uitgevoerd</span>
        </div>
      )}
    </div>
  );
}
