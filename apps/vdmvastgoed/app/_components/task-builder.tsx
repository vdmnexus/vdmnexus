"use client";

import { useState } from "react";
import {
  CreditCard,
  MessageSquare,
  Wrench,
  FileBarChart,
  FileSignature,
  Building2,
  ChevronRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import { panden, huurders } from "../../lib/mock-data";
import { sendChatMessageStream } from "../../lib/api";

// ─── Types ───────────────────────────────────────────────

type Stap = "domein" | "actie" | "doel" | "bevestig" | "uitgevoerd";

interface Domein {
  id: string;
  label: string;
  icon: typeof CreditCard;
  acties: Actie[];
}

interface Actie {
  id: string;
  label: string;
  beschrijving: string;
  doelType?: "huurder" | "pand" | "geen";
}

// ─── Config ──────────────────────────────────────────────

const domeinen: Domein[] = [
  {
    id: "incasso", label: "Huurincasso", icon: CreditCard,
    acties: [
      { id: "herinnering", label: "Stuur betalingsherinnering", beschrijving: "Verstuur een herinnering voor een openstaande factuur", doelType: "huurder" },
      { id: "incasso-alle", label: "Alle herinneringen versturen", beschrijving: "Verstuur herinneringen naar alle huurders met openstaande facturen", doelType: "geen" },
      { id: "overzicht", label: "Facturoverzicht genereren", beschrijving: "Genereer een overzicht van alle facturen deze maand", doelType: "geen" },
    ],
  },
  {
    id: "onderhoud", label: "Onderhoud", icon: Wrench,
    acties: [
      { id: "ticket", label: "Onderhoudsmelding aanmaken", beschrijving: "Maak een nieuw onderhoudsticket aan", doelType: "pand" },
      { id: "escaleer", label: "Ticket escaleren", beschrijving: "Escaleer een openstaand ticket naar externe partij", doelType: "geen" },
      { id: "inspectie", label: "Inspectie inplannen", beschrijving: "Plan een periodieke inspectie in voor een pand", doelType: "pand" },
    ],
  },
  {
    id: "communicatie", label: "Communicatie", icon: MessageSquare,
    acties: [
      { id: "bericht-huurder", label: "Bericht aan huurder", beschrijving: "Stel een persoonlijk bericht op", doelType: "huurder" },
      { id: "bericht-pand", label: "Bericht aan alle huurders", beschrijving: "Stel een bericht op voor alle huurders in een pand", doelType: "pand" },
      { id: "nieuwsbrief", label: "Nieuwsbrief opstellen", beschrijving: "Stel een nieuwsbrief op voor alle huurders", doelType: "geen" },
    ],
  },
  {
    id: "rapportage", label: "Rapportage", icon: FileBarChart,
    acties: [
      { id: "dagrapport", label: "Dagrapportage", beschrijving: "Genereer een rapport van vandaag", doelType: "geen" },
      { id: "maandrapport", label: "Maandrapport", beschrijving: "Genereer het maandoverzicht", doelType: "geen" },
      { id: "pandrapport", label: "Pandrapport", beschrijving: "Genereer een rapport voor een specifiek pand", doelType: "pand" },
    ],
  },
  {
    id: "contracten", label: "Contractbeheer", icon: FileSignature,
    acties: [
      { id: "verlenging", label: "Verlengingsvoorstel", beschrijving: "Stel een contractverlenging op met huurverhoging", doelType: "huurder" },
      { id: "opzegging", label: "Opzegging verwerken", beschrijving: "Verwerk een opzegging en start het proces", doelType: "huurder" },
      { id: "scan", label: "Contracten scannen", beschrijving: "Scan alle contracten op aankomende verloopdatums", doelType: "geen" },
    ],
  },
  {
    id: "portefeuille", label: "Portefeuille", icon: Building2,
    acties: [
      { id: "bezetting", label: "Bezettingsanalyse", beschrijving: "Analyseer de bezettingsgraad per pand", doelType: "geen" },
      { id: "rendement", label: "Rendementoverzicht", beschrijving: "Bereken het rendement per pand", doelType: "geen" },
      { id: "pandinfo", label: "Pandinfo opvragen", beschrijving: "Vraag gedetailleerde info op over een pand", doelType: "pand" },
    ],
  },
];

function buildTaskPrompt(domein: Domein, actie: Actie, doelNaam?: string): string {
  const parts = [`Voer de volgende taak uit:\n\nDomein: ${domein.label}\nActie: ${actie.label}`];
  if (doelNaam) parts.push(`Doel: ${doelNaam}`);
  parts.push(`\nBeschrijving: ${actie.beschrijving}`);
  if (doelNaam) {
    parts.push(`\nGebruik de beschikbare data om deze taak zo concreet en volledig mogelijk uit te voeren voor ${doelNaam}. Geef een duidelijk, professioneel resultaat.`);
  } else {
    parts.push(`\nGebruik de beschikbare data om deze taak zo concreet en volledig mogelijk uit te voeren. Geef een duidelijk, professioneel resultaat.`);
  }
  return parts.join("\n");
}

// ─── Component ───────────────────────────────────────────

export function TaskBuilder() {
  const [open, setOpen] = useState(false);
  const [stap, setStap] = useState<Stap>("domein");
  const [gekozenDomein, setGekozenDomein] = useState<Domein | null>(null);
  const [gekozenActie, setGekozenActie] = useState<Actie | null>(null);
  const [gekozenDoel, setGekozenDoel] = useState<{ id: string; naam: string } | null>(null);
  const [resultaat, setResultaat] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => { setStap("domein"); setGekozenDomein(null); setGekozenActie(null); setGekozenDoel(null); setResultaat(""); setIsLoading(false); };
  const sluiten = () => { setOpen(false); setTimeout(reset, 300); };

  const kiesDomein = (d: Domein) => { setGekozenDomein(d); setStap("actie"); };
  const kiesActie = (a: Actie) => { setGekozenActie(a); setStap(a.doelType === "geen" ? "bevestig" : "doel"); };
  const kiesDoel = (id: string, naam: string) => { setGekozenDoel({ id, naam }); setStap("bevestig"); };

  const bevestig = async () => {
    setStap("uitgevoerd");
    setIsLoading(true);
    setResultaat("");

    const prompt = buildTaskPrompt(gekozenDomein!, gekozenActie!, gekozenDoel?.naam);

    try {
      await sendChatMessageStream(
        prompt,
        undefined, // new conversation for each task
        () => { /* meta — we don't need the conversationId here */ },
        (chunk) => setResultaat((prev) => prev + chunk),
        () => setIsLoading(false),
        () => {
          setResultaat("Er ging iets mis bij het uitvoeren van de taak. Probeer het opnieuw.");
          setIsLoading(false);
        }
      );
    } catch {
      setResultaat("Er ging iets mis bij het uitvoeren van de taak. Probeer het opnieuw.");
      setIsLoading(false);
    }
  };

  const terug = () => {
    if (stap === "actie") { setStap("domein"); setGekozenDomein(null); }
    else if (stap === "doel") { setStap("actie"); setGekozenActie(null); }
    else if (stap === "bevestig") {
      if (gekozenActie?.doelType === "geen") { setStap("actie"); setGekozenActie(null); }
      else { setStap("doel"); setGekozenDoel(null); }
    }
  };

  const doelen = gekozenActie?.doelType === "huurder"
    ? huurders.map((h) => ({ id: h.id, naam: h.naam, sub: `Unit ${h.unitNr} — €${h.huurprijs.toLocaleString("nl-NL")}/mnd` }))
    : gekozenActie?.doelType === "pand"
      ? panden.map((p) => ({ id: p.id, naam: p.naam, sub: `${p.bezet}/${p.units} bezet` }))
      : [];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-primary-300 bg-white px-4 py-3.5 text-left transition-colors hover:border-primary-400 hover:bg-primary-50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100">
          <Plus size={15} className="text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Geef de agent een taak</p>
          <p className="text-xs text-primary-400">Kies domein, actie en doel — stap voor stap</p>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary-200 px-4 py-3">
        <div className="flex items-center gap-2">
          {stap !== "domein" && stap !== "uitgevoerd" && (
            <button onClick={terug} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-primary-100 transition-colors">
              <ArrowLeft size={14} className="text-primary-400" />
            </button>
          )}
          <p className="text-sm font-medium text-primary">
            {stap === "domein" && "Kies een domein"}
            {stap === "actie" && gekozenDomein?.label}
            {stap === "doel" && gekozenActie?.label}
            {stap === "bevestig" && "Bevestig taak"}
            {stap === "uitgevoerd" && (isLoading ? "Sophie voert taak uit..." : "Taak uitgevoerd")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress */}
          <div className="flex items-center gap-1">
            {["domein", "actie", "doel", "bevestig"].map((s) => {
              if (s === "doel" && gekozenActie?.doelType === "geen") return null;
              const stappenVolgorde = ["domein", "actie", gekozenActie?.doelType !== "geen" ? "doel" : null, "bevestig"].filter(Boolean) as string[];
              const active = stappenVolgorde.indexOf(s) <= stappenVolgorde.indexOf(stap) || stap === "uitgevoerd";
              return <div key={s} className={`h-1 rounded-full transition-all ${active ? "w-4 bg-primary-900" : "w-1 bg-primary-200"}`} />;
            })}
          </div>
          <button onClick={sluiten} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-primary-100 transition-colors">
            <X size={14} className="text-primary-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {stap === "domein" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {domeinen.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.id}
                  onClick={() => kiesDomein(d)}
                  className="flex items-center gap-2.5 rounded-lg border border-primary-200 bg-white p-3 text-left transition-colors hover:bg-primary-50"
                >
                  <Icon size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-primary">{d.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {stap === "actie" && gekozenDomein && (
          <div className="space-y-1.5">
            {gekozenDomein.acties.map((a) => (
              <button
                key={a.id}
                onClick={() => kiesActie(a)}
                className="flex w-full items-center justify-between rounded-lg border border-primary-200 p-3 text-left transition-colors hover:bg-primary-50"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{a.label}</p>
                  <p className="text-xs text-primary-400 mt-0.5">{a.beschrijving}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-primary-300" />
              </button>
            ))}
          </div>
        )}

        {stap === "doel" && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {doelen.map((d) => (
              <button
                key={d.id}
                onClick={() => kiesDoel(d.id, d.naam)}
                className="flex w-full items-center justify-between rounded-lg border border-primary-200 px-3 py-2.5 text-left transition-colors hover:bg-primary-50"
              >
                <div>
                  <p className="text-sm font-medium text-primary">{d.naam}</p>
                  <p className="text-xs text-primary-400">{d.sub}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-primary-300" />
              </button>
            ))}
          </div>
        )}

        {stap === "bevestig" && gekozenDomein && gekozenActie && (
          <div>
            <div className="rounded-lg bg-primary-50 p-3 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-400">Domein</span>
                <span className="font-medium text-primary">{gekozenDomein.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-400">Actie</span>
                <span className="font-medium text-primary">{gekozenActie.label}</span>
              </div>
              {gekozenDoel && (
                <div className="flex justify-between">
                  <span className="text-primary-400">{gekozenActie.doelType === "huurder" ? "Huurder" : "Pand"}</span>
                  <span className="font-medium text-primary">{gekozenDoel.naam}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={bevestig}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800"
              >
                <Check size={14} />
                Bevestig
              </button>
              <button
                onClick={sluiten}
                className="rounded-lg border border-primary-200 px-4 py-2.5 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {stap === "uitgevoerd" && (
          <div className="py-2">
            {!resultaat && isLoading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={20} className="text-primary-400 animate-spin" />
                <p className="text-sm text-primary-400">Sophie voert de taak uit...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {!isLoading && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                      <Check size={16} className="text-primary-700" />
                    </div>
                    <p className="text-sm font-medium text-primary">Taak uitgevoerd</p>
                  </div>
                )}
                <div className="rounded-lg bg-primary-50 p-3 max-h-80 overflow-y-auto">
                  <p className="text-sm text-primary-600 leading-relaxed whitespace-pre-wrap">
                    {resultaat}
                    {isLoading && (
                      <span className="inline-block w-1.5 h-3 bg-primary-400 animate-pulse ml-0.5 -mb-0.5 rounded-sm" />
                    )}
                  </p>
                </div>
                {!isLoading && (
                  <div className="flex gap-2 justify-center">
                    <button onClick={reset} className="flex items-center gap-1.5 rounded-lg bg-primary-900 px-3 py-2 text-xs font-medium text-white hover:bg-primary-800">
                      <Plus size={13} />
                      Nieuwe taak
                    </button>
                    <button onClick={sluiten} className="rounded-lg border border-primary-200 px-3 py-2 text-xs font-medium text-primary-500 hover:bg-primary-50">
                      Sluiten
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
