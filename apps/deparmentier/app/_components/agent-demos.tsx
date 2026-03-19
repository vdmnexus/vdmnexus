"use client";

import { useState } from "react";
import { ReceptieDemo } from "./agents/receptie-demo";
import { OnderhoudDemo } from "./agents/onderhoud-demo";
import { CommunicatieDemo } from "./agents/communicatie-demo";
import { MessageSquare, Wrench, Megaphone } from "lucide-react";

const tabs = [
  {
    id: "receptie",
    label: "Receptie",
    icon: MessageSquare,
    description: "Bezoekers ontvangen en huurders notificeren",
  },
  {
    id: "onderhoud",
    label: "Onderhoud",
    icon: Wrench,
    description: "Meldingen, tickets en workflow management",
  },
  {
    id: "communicatie",
    label: "Communicatie",
    icon: Megaphone,
    description: "Berichten genereren en multi-channel versturen",
  },
] as const;

export function AgentDemos() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    "receptie"
  );

  return (
    <section id="demos" className="py-24 bg-primary-100">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center mb-12">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">
            Live Demo
          </p>
          <h2 className="text-3xl font-bold text-primary mb-4">
            Drie agents, één gebouw
          </h2>
          <p className="text-primary-600 max-w-lg mx-auto">
            Ervaar hoe AI agents de dagelijkse operatie van De Parmentier
            automatiseren. Klik en ontdek.
          </p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary-900 text-white shadow-lg"
                  : "bg-white text-primary border border-primary-200 hover:border-primary-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-primary-600 text-sm mb-6">
          {tabs.find((t) => t.id === activeTab)?.description}
        </p>

        {activeTab === "receptie" && <ReceptieDemo />}
        {activeTab === "onderhoud" && <OnderhoudDemo />}
        {activeTab === "communicatie" && <CommunicatieDemo />}
      </div>
    </section>
  );
}
