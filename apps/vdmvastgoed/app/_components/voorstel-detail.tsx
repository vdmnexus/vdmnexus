"use client";

import { useState } from "react";
import { Bot, User, ArrowLeft, Check, Send, Download, ArrowUpRight, Plus, Loader2 } from "lucide-react";
import type { AgentVoorstel, VoorstelActie } from "../../lib/agent-voorstellen";

const actieConfig: Record<VoorstelActie, { label: string; icon: typeof Send }> = {
  verstuur: { label: "Agent verstuurt dit", icon: Send },
  download: { label: "Agent genereert dit", icon: Download },
  aanmaken: { label: "Agent maakt dit aan", icon: Plus },
  verlengen: { label: "Agent verstuurt voorstel", icon: Send },
  escaleer: { label: "Agent escaleert dit", icon: ArrowUpRight },
};

const domeinLabel: Record<string, string> = {
  incasso: "Incasso",
  onderhoud: "Onderhoud",
  communicatie: "Communicatie",
  rapportage: "Rapportage",
  contracten: "Contracten",
};

interface Props {
  voorstel: AgentVoorstel;
  onBack: () => void;
  onAgentAfhandelen: (id: string) => void;
  onZelfAfhandelen: (id: string) => void;
  onAfwijzen: (id: string) => void;
}

export function VoorstelDetail({ voorstel, onBack, onAgentAfhandelen, onZelfAfhandelen, onAfwijzen }: Props) {
  const [uitvoerend, setUitvoerend] = useState(false);
  const actie = actieConfig[voorstel.actie];
  const ActieIcon = actie.icon;

  const handleAgent = () => {
    setUitvoerend(true);
    setTimeout(() => onAgentAfhandelen(voorstel.id), 1200);
  };

  if (uitvoerend) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 size={24} className="text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-primary">Agent voert taak uit...</p>
          <p className="text-xs text-primary-400 mt-1">{voorstel.titel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* Back */}
      <button onClick={onBack} className="mb-5 flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary transition-colors">
        <ArrowLeft size={15} />
        Terug naar overzicht
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-500 uppercase">
            {domeinLabel[voorstel.domein] ?? voorstel.domein}
          </span>
          <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-500">
            Wacht op goedkeuring
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-primary">{voorstel.titel}</h1>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-primary-200 bg-white p-4 mb-4">
        <p className="text-sm text-primary-600 leading-relaxed">{voorstel.beschrijving}</p>
        {voorstel.details && Object.keys(voorstel.details).length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary-100 flex flex-wrap gap-x-6 gap-y-1">
            {Object.entries(voorstel.details).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-xs text-primary-400">{key.replace("_", " ")}:</span>
                <span className="text-xs font-medium text-primary tabular-nums">
                  {typeof val === "number" && key.includes("huur") ? `€${val.toLocaleString("nl-NL")}` : String(val)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Agent afhandelen */}
        <div className="rounded-xl border border-primary-200 bg-white p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <Bot size={15} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Agent afhandelen</p>
              <p className="text-[11px] text-primary-400">Automatisch uitvoeren</p>
            </div>
          </div>
          <p className="text-xs text-primary-500 leading-relaxed mb-4 flex-1">{voorstel.agentAanpak}</p>
          <button
            onClick={handleAgent}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            <ActieIcon size={14} />
            {actie.label}
          </button>
        </div>

        {/* Zelf afhandelen */}
        <div className="rounded-xl border border-primary-200 bg-white p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
              <User size={15} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Zelf afhandelen</p>
              <p className="text-[11px] text-primary-400">Handmatig uitvoeren</p>
            </div>
          </div>
          <ol className="text-xs text-primary-500 leading-relaxed mb-4 flex-1 space-y-1.5 list-decimal list-inside">
            {voorstel.zelfStappen.map((stap, i) => (
              <li key={i}>{stap}</li>
            ))}
          </ol>
          <button
            onClick={() => onZelfAfhandelen(voorstel.id)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 px-4 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
          >
            <Check size={14} />
            Ik handel dit zelf af
          </button>
        </div>
      </div>

      {/* Skip */}
      <div className="mt-4 text-center">
        <button
          onClick={() => onAfwijzen(voorstel.id)}
          className="text-xs text-primary-400 hover:text-primary transition-colors"
        >
          Niet nu — overslaan
        </button>
      </div>
    </div>
  );
}
