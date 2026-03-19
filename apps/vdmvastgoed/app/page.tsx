"use client";

import { useState, useCallback } from "react";
import {
  CreditCard,
  MessageSquare,
  Wrench,
  FileBarChart,
  FileSignature,
  Building2,
  ArrowLeft,
  Bot,
  ChevronRight,
} from "lucide-react";
import {
  panden,
  huurders,
  facturen,
  onderhoudTickets,
  getBezettingsgraad,
  getOpenFacturenBedrag,
} from "../lib/mock-data";
import {
  incassoVoorstellen,
  onderhoudVoorstellen,
  communicatieVoorstellen,
  rapportageVoorstellen,
  contractVoorstellen,
  type AgentVoorstel,
  type VoorstelStatus,
} from "../lib/agent-voorstellen";
import { VoorstelCard } from "./_components/voorstel-card";
import { TaskBuilder } from "./_components/task-builder";
import { ApprovalsPanel } from "./_components/approvals-panel";
import { AgentChat } from "./_components/agent-chat";
import { VoorstelDetail } from "./_components/voorstel-detail";

// ─── Types ───────────────────────────────────────────────

type DomeinId = "incasso" | "onderhoud" | "communicatie" | "rapportage" | "contracten" | "portefeuille";

interface Capability {
  id: DomeinId;
  icon: typeof CreditCard;
  title: string;
  beschrijving: string;
  metric: () => string;
}

// ─── Capabilities ────────────────────────────────────────

const capabilities: Capability[] = [
  {
    id: "incasso", icon: CreditCard, title: "Huurincasso",
    beschrijving: "Facturen, herinneringen en achterstanden",
    metric: () => {
      const open = facturen.filter((f) => f.status === "open" || f.status === "verlopen");
      return `${open.length} openstaand`;
    },
  },
  {
    id: "onderhoud", icon: Wrench, title: "Onderhoud",
    beschrijving: "Tickets, meldingen en planning",
    metric: () => `${onderhoudTickets.filter((t) => t.status !== "afgerond").length} open`,
  },
  {
    id: "communicatie", icon: MessageSquare, title: "Communicatie",
    beschrijving: "Berichten en correspondentie",
    metric: () => "2 concepten",
  },
  {
    id: "rapportage", icon: FileBarChart, title: "Rapportage",
    beschrijving: "Rapporten en analyses",
    metric: () => `${getBezettingsgraad()}% bezet`,
  },
  {
    id: "contracten", icon: FileSignature, title: "Contracten",
    beschrijving: "Verlengingen en huurverhogingen",
    metric: () => {
      const nu = new Date("2026-03-19");
      return `${huurders.filter((h) => new Date(h.contractEinde) < nu).length} verlopen`;
    },
  },
  {
    id: "portefeuille", icon: Building2, title: "Portefeuille",
    beschrijving: "Panden en bezetting",
    metric: () => `${panden.length} panden`,
  },
];

// ─── Helpers ─────────────────────────────────────────────

function getVoorstellenForDomein(domein: DomeinId): AgentVoorstel[] {
  switch (domein) {
    case "incasso": return incassoVoorstellen;
    case "onderhoud": return onderhoudVoorstellen;
    case "communicatie": return communicatieVoorstellen;
    case "rapportage": return rapportageVoorstellen;
    case "contracten": return contractVoorstellen;
    case "portefeuille": return [];
  }
}

const alleVoorstellen = [
  ...incassoVoorstellen,
  ...onderhoudVoorstellen,
  ...communicatieVoorstellen,
  ...rapportageVoorstellen,
  ...contractVoorstellen,
];

// ─── Main ────────────────────────────────────────────────

export default function AgentDashboard() {
  const [activeDomein, setActiveDomein] = useState<DomeinId | null>(null);
  const [selectedVoorstelId, setSelectedVoorstelId] = useState<string | null>(null);
  const [voorstellen, setVoorstellen] = useState<Record<string, VoorstelStatus>>({});

  const updateVoorstel = useCallback((id: string, status: VoorstelStatus) => {
    setVoorstellen((prev) => ({ ...prev, [id]: status }));
    setSelectedVoorstelId(null);
    if (status === "goedgekeurd") {
      setTimeout(() => setVoorstellen((prev) => ({ ...prev, [id]: "uitgevoerd" })), 1500);
    }
  }, []);

  const getStatus = (v: AgentVoorstel): AgentVoorstel => ({
    ...v,
    status: voorstellen[v.id] ?? v.status,
  });

  const voorstellenMetStatus = alleVoorstellen.map(getStatus);
  const selectedVoorstel = selectedVoorstelId
    ? alleVoorstellen.find((v) => v.id === selectedVoorstelId) ?? null
    : null;

  // Determine center content
  let centerContent: React.ReactNode;
  if (selectedVoorstel) {
    centerContent = (
      <VoorstelDetail
        voorstel={selectedVoorstel}
        onBack={() => setSelectedVoorstelId(null)}
        onAgentAfhandelen={(id) => updateVoorstel(id, "goedgekeurd")}
        onZelfAfhandelen={(id) => updateVoorstel(id, "zelf")}
        onAfwijzen={(id) => updateVoorstel(id, "afgewezen")}
      />
    );
  } else if (activeDomein) {
    centerContent = (
      <DomeinView
        domein={activeDomein}
        onBack={() => setActiveDomein(null)}
        onApprove={(id) => updateVoorstel(id, "goedgekeurd")}
        onReject={(id) => updateVoorstel(id, "afgewezen")}
        getStatus={getStatus}
      />
    );
  } else {
    centerContent = (
      <HomeView voorstellen={voorstellen} onSelectDomein={setActiveDomein} />
    );
  }

  return (
    <div className="flex h-full">
      {/* Left — Approvals */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col border-r border-primary-200 bg-white">
        <ApprovalsPanel
          voorstellen={voorstellenMetStatus}
          selectedId={selectedVoorstelId}
          onSelect={(id) => { setSelectedVoorstelId(id); setActiveDomein(null); }}
        />
      </div>

      {/* Center — Main content */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {centerContent}
      </div>

      {/* Right — Chat */}
      <div className="hidden xl:flex w-80 shrink-0 flex-col border-l border-primary-200 bg-white">
        <AgentChat />
      </div>
    </div>
  );
}

// ─── Home View ───────────────────────────────────────────

function HomeView({
  voorstellen,
  onSelectDomein,
}: {
  voorstellen: Record<string, VoorstelStatus>;
  onSelectDomein: (id: DomeinId) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Goedemorgen</h1>
        <p className="mt-1 text-sm text-primary-400">
          {panden.length} panden · {huurders.length} huurders · {getBezettingsgraad()}% bezetting
        </p>
      </div>

      {/* Task builder */}
      <div className="mb-6">
        <TaskBuilder />
      </div>

      {/* Capability cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {capabilities.map((cap) => {
          const Icon = cap.icon;
          const wachtend = getVoorstellenForDomein(cap.id).filter(
            (v) => (voorstellen[v.id] ?? v.status) === "wachtend"
          ).length;

          return (
            <button
              key={cap.id}
              onClick={() => onSelectDomein(cap.id)}
              className="group relative flex flex-col items-start rounded-xl border border-primary-200 bg-white p-3.5 text-left transition-colors hover:bg-primary-50"
            >
              {wachtend > 0 && (
                <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-900 text-[9px] font-medium text-white">
                  {wachtend}
                </span>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 mb-2.5">
                <Icon size={15} className="text-primary-600" />
              </div>
              <p className="text-sm font-medium text-primary mb-0.5">{cap.title}</p>
              <p className="text-[11px] text-primary-400 leading-relaxed mb-2">{cap.beschrijving}</p>
              <div className="mt-auto flex w-full items-center justify-between">
                <p className="text-[11px] text-primary-500">{cap.metric()}</p>
                <ChevronRight size={13} className="text-primary-300 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: show approvals inline */}
      <div className="lg:hidden mb-6">
        <p className="text-xs font-medium text-primary-400 uppercase tracking-wider mb-2">Goedkeuringen</p>
        <p className="text-xs text-primary-400">Bekijk goedkeuringen in landscape of op desktop.</p>
      </div>
    </div>
  );
}

// ─── Domain View ─────────────────────────────────────────

function DomeinView({
  domein,
  onBack,
  onApprove,
  onReject,
  getStatus,
}: {
  domein: DomeinId;
  onBack: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  getStatus: (v: AgentVoorstel) => AgentVoorstel;
}) {
  const cap = capabilities.find((c) => c.id === domein)!;
  const Icon = cap.icon;
  const domeinVoorstellen = getVoorstellenForDomein(domein).map(getStatus);
  const wachtend = domeinVoorstellen.filter((v) => v.status === "wachtend").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary transition-colors">
          <ArrowLeft size={15} />
          Terug
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
            <Icon size={18} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-primary">{cap.title}</h1>
            <p className="text-sm text-primary-400">{cap.beschrijving}</p>
          </div>
        </div>
      </div>

      {domein === "incasso" && <IncassoOverzicht />}
      {domein === "onderhoud" && <OnderhoudOverzicht />}
      {domein === "communicatie" && <CommunicatieOverzicht />}
      {domein === "rapportage" && <RapportageOverzicht />}
      {domein === "contracten" && <ContractenOverzicht />}
      {domein === "portefeuille" && <PortefeuilleOverzicht />}

      {domeinVoorstellen.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot size={14} className="text-primary-400" />
            <span className="text-xs font-medium text-primary-400 uppercase tracking-wider">Voorstellen</span>
            {wachtend > 0 && (
              <span className="rounded-full bg-primary-900 px-2 py-0.5 text-[10px] font-medium text-white">{wachtend}</span>
            )}
          </div>
          <div className="space-y-2">
            {domeinVoorstellen.map((v) => (
              <VoorstelCard key={v.id} voorstel={v} onApprove={onApprove} onReject={onReject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared components ──────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-primary-200 bg-white p-4">
      <p className="text-2xl font-semibold tracking-tight text-primary">{value}</p>
      <p className="text-xs text-primary-400 mt-0.5">{label}</p>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary-200 bg-primary-50/50">
            {headers.map((h) => (
              <th key={h} className={`px-4 py-2.5 text-left text-xs font-medium text-primary-400 ${h === "Bedrag" || h === "Huur/mnd" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-primary-100">{children}</tbody>
      </table>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-600">{children}</span>;
}

// ─── Domain overviews ───────────────────────────────────

function IncassoOverzicht() {
  const betaald = facturen.filter((f) => f.status === "betaald");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={`${betaald.length}/${facturen.length}`} label="Betaald" />
        <StatCard value={`€${getOpenFacturenBedrag().toLocaleString("nl-NL")}`} label="Openstaand" />
        <StatCard value={String(facturen.filter((f) => f.status === "verlopen").length)} label="Verlopen" />
      </div>
      <DataTable headers={["Huurder", "Periode", "Bedrag", "Status"]}>
        {facturen.map((f) => (
          <tr key={f.id} className="hover:bg-primary-50/50">
            <td className="px-4 py-2.5 font-medium text-primary">{huurders.find((h) => h.id === f.huurderId)?.naam}</td>
            <td className="px-4 py-2.5 text-primary-500">{f.periode}</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-primary">€{f.bedrag.toLocaleString("nl-NL")}</td>
            <td className="px-4 py-2.5"><Badge>{f.status}</Badge></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function OnderhoudOverzicht() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={String(onderhoudTickets.length)} label="Totaal" />
        <StatCard value={String(onderhoudTickets.filter((t) => t.status === "open").length)} label="Open" />
        <StatCard value={String(onderhoudTickets.filter((t) => t.status === "in_behandeling").length)} label="In behandeling" />
      </div>
      <DataTable headers={["Omschrijving", "Unit", "Prioriteit", "Status"]}>
        {onderhoudTickets.map((t) => (
          <tr key={t.id} className="hover:bg-primary-50/50">
            <td className="px-4 py-2.5 font-medium text-primary">{t.omschrijving}</td>
            <td className="px-4 py-2.5 text-primary-500">{t.unitNr}</td>
            <td className="px-4 py-2.5"><Badge>{t.prioriteit}</Badge></td>
            <td className="px-4 py-2.5"><Badge>{t.status.replace("_", " ")}</Badge></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function CommunicatieOverzicht() {
  const berichten = [
    { id: 1, onderwerp: "Liftonderhoud De Parmentier", ontvanger: "22 huurders", datum: "17 mrt", status: "concept" },
    { id: 2, onderwerp: "Welkomstpakket unit 3B", ontvanger: "Nieuwe huurder", datum: "16 mrt", status: "concept" },
    { id: 3, onderwerp: "Huurverhoging 2026", ontvanger: "Alle huurders", datum: "1 mrt", status: "verstuurd" },
    { id: 4, onderwerp: "Nieuwjaarsbericht", ontvanger: "Alle huurders", datum: "31 dec", status: "verstuurd" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard value="2" label="Concepten" />
        <StatCard value="14" label="Verstuurd" />
      </div>
      <DataTable headers={["Onderwerp", "Ontvanger", "Datum", "Status"]}>
        {berichten.map((b) => (
          <tr key={b.id} className="hover:bg-primary-50/50">
            <td className="px-4 py-2.5 font-medium text-primary">{b.onderwerp}</td>
            <td className="px-4 py-2.5 text-primary-500">{b.ontvanger}</td>
            <td className="px-4 py-2.5 text-primary-500">{b.datum}</td>
            <td className="px-4 py-2.5"><Badge>{b.status}</Badge></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

function RapportageOverzicht() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={`${getBezettingsgraad()}%`} label="Bezetting" />
        <StatCard value={`€${getOpenFacturenBedrag().toLocaleString("nl-NL")}`} label="Openstaand" />
        <StatCard value={`${facturen.filter((f) => f.status === "betaald").length}/${facturen.length}`} label="Betaald" />
        <StatCard value={String(onderhoudTickets.filter((t) => t.status !== "afgerond").length)} label="Open tickets" />
      </div>
      <div className="rounded-xl border border-primary-200 bg-white p-5">
        <p className="text-sm font-medium text-primary mb-4">Bezetting per pand</p>
        <div className="space-y-3">
          {panden.map((p) => {
            const pct = Math.round((p.bezet / p.units) * 100);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm text-primary w-40 truncate">{p.naam}</span>
                <div className="flex-1 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-900 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs tabular-nums text-primary-400 w-20 text-right">{p.bezet}/{p.units} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ContractenOverzicht() {
  const nu = new Date("2026-03-19");
  const sorted = [...huurders].sort((a, b) => new Date(a.contractEinde).getTime() - new Date(b.contractEinde).getTime());
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={String(huurders.length)} label="Contracten" />
        <StatCard value={String(huurders.filter((h) => new Date(h.contractEinde) < nu).length)} label="Verlopen" />
        <StatCard value={String(huurders.filter((h) => { const m = (new Date(h.contractEinde).getTime() - nu.getTime()) / (1000*60*60*24*30); return m > 0 && m <= 6; }).length)} label="Aflopend <6 mnd" />
      </div>
      <DataTable headers={["Huurder", "Unit", "Pand", "Huur/mnd", "Einde", "Status"]}>
        {sorted.map((h) => {
          const einde = new Date(h.contractEinde);
          const verlopen = einde < nu;
          const maanden = (einde.getTime() - nu.getTime()) / (1000*60*60*24*30);
          const binnenkort = maanden > 0 && maanden <= 6;
          return (
            <tr key={h.id} className="hover:bg-primary-50/50">
              <td className="px-4 py-2.5 font-medium text-primary">{h.naam}</td>
              <td className="px-4 py-2.5 text-primary-500">{h.unitNr}</td>
              <td className="px-4 py-2.5 text-primary-500">{panden.find((p) => p.id === h.pandId)?.naam}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-primary">€{h.huurprijs.toLocaleString("nl-NL")}</td>
              <td className="px-4 py-2.5 tabular-nums text-primary-500">{h.contractEinde}</td>
              <td className="px-4 py-2.5">
                <Badge>{verlopen ? "Verlopen" : binnenkort ? "Aflopend" : "Actief"}</Badge>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}

function PortefeuilleOverzicht() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={String(panden.length)} label="Panden" />
        <StatCard value={String(panden.reduce((s, p) => s + p.units, 0))} label="Units" />
        <StatCard value={`${getBezettingsgraad()}%`} label="Bezetting" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {panden.map((p) => {
          const ph = huurders.filter((h) => h.pandId === p.id);
          const pct = Math.round((p.bezet / p.units) * 100);
          return (
            <div key={p.id} className="rounded-xl border border-primary-200 bg-white p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-primary">{p.naam}</p>
                  <p className="text-xs text-primary-400">{p.adres}</p>
                </div>
                <Badge>{p.type === "woning" ? "Woning" : p.type === "bedrijf" ? "Bedrijf" : "Gemengd"}</Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-primary-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-900 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs tabular-nums font-medium text-primary">{p.bezet}/{p.units}</span>
              </div>
              <div className="flex justify-between text-xs text-primary-400">
                <span>{ph.length} huurders</span>
                <span className="tabular-nums">€{ph.reduce((s, h) => s + h.huurprijs, 0).toLocaleString("nl-NL")}/mnd</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
