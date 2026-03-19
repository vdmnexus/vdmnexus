export interface AgentLog {
  id: string;
  timestamp: string;
  type: "info" | "actie" | "beslissing" | "api" | "error";
  bericht: string;
}

export const agentLogs: AgentLog[] = [
  { id: "l1", timestamp: "2026-03-19 08:00:01", type: "info", bericht: "Agent gestart — dagelijkse portefeuille-scan initiëren" },
  { id: "l2", timestamp: "2026-03-19 08:00:03", type: "api", bericht: "GET /facturen — 10 facturen opgehaald" },
  { id: "l3", timestamp: "2026-03-19 08:00:04", type: "beslissing", bericht: "4 openstaande facturen gedetecteerd, waarvan 2 verlopen" },
  { id: "l4", timestamp: "2026-03-19 08:00:05", type: "actie", bericht: "Herinnering opgesteld voor Ahmed El Amrani — factuur €1.950 (19d verlopen)" },
  { id: "l5", timestamp: "2026-03-19 08:00:05", type: "actie", bericht: "Herinnering opgesteld voor Peter Willems — factuur €1.275 (19d verlopen)" },
  { id: "l6", timestamp: "2026-03-19 08:00:06", type: "actie", bericht: "Standaard herinnering opgesteld voor Jan de Vries — factuur €1.450" },
  { id: "l7", timestamp: "2026-03-19 08:00:06", type: "actie", bericht: "Standaard herinnering opgesteld voor Sophie van den Berg — factuur €1.875" },
  { id: "l8", timestamp: "2026-03-19 08:00:08", type: "api", bericht: "GET /onderhoud-tickets — 4 tickets opgehaald" },
  { id: "l9", timestamp: "2026-03-19 08:00:09", type: "beslissing", bericht: "Ticket OT2 (verwarming A-101) — hoge prioriteit, 2 dagen open → escalatie-voorstel aangemaakt" },
  { id: "l10", timestamp: "2026-03-19 08:00:10", type: "api", bericht: "GET /contracten — 10 contracten opgehaald" },
  { id: "l11", timestamp: "2026-03-19 08:00:11", type: "beslissing", bericht: "3 verlopen contracten gedetecteerd — verlengingsvoorstellen met CPI-indexatie berekend" },
  { id: "l12", timestamp: "2026-03-19 08:00:12", type: "actie", bericht: "Verlengingsvoorstel opgesteld: Maria Bakker €1.625 → €1.675 (+3,1%)" },
  { id: "l13", timestamp: "2026-03-19 08:00:12", type: "actie", bericht: "Verlengingsvoorstel opgesteld: Jan de Vries €1.450 → €1.495 (+3,1%)" },
  { id: "l14", timestamp: "2026-03-19 08:00:14", type: "api", bericht: "POST /rapport — dagrapportage gegenereerd" },
  { id: "l15", timestamp: "2026-03-19 08:00:15", type: "info", bericht: "Scan compleet — 13 voorstellen aangemaakt, wachtend op goedkeuring" },
  { id: "l16", timestamp: "2026-03-19 06:00:00", type: "actie", bericht: "[goedgekeurd] Betalingsherinnering verstuurd aan Ahmed El Amrani" },
  { id: "l17", timestamp: "2026-03-19 04:12:00", type: "actie", bericht: "[goedgekeurd] Dagrapportage 19 maart — gedownload door gebruiker" },
  { id: "l18", timestamp: "2026-03-18 16:30:00", type: "actie", bericht: "[goedgekeurd] Onderhoudsticket lekkende kraan 2A — loodgieter ingepland" },
];

export interface ChatHistoryItem {
  id: string;
  timestamp: string;
  vraag: string;
  antwoord: string;
  domein: string;
}

export const chatHistory: ChatHistoryItem[] = [
  {
    id: "ch1",
    timestamp: "2026-03-19 09:15",
    vraag: "Welke facturen zijn verlopen?",
    antwoord: "Er zijn 2 verlopen facturen: Ahmed El Amrani (€1.950, feb 2026) en Peter Willems (€1.275, feb 2026). Herinneringen staan klaar.",
    domein: "incasso",
  },
  {
    id: "ch2",
    timestamp: "2026-03-18 14:30",
    vraag: "Plan CV-inspectie in voor Keizersgracht",
    antwoord: "CV-ketel inspectie ingepland voor Keizersgracht 440, alle 8 units. Bevestigingsberichten opgesteld voor huurders.",
    domein: "onderhoud",
  },
  {
    id: "ch3",
    timestamp: "2026-03-18 10:00",
    vraag: "Hoe staat het met de bezetting?",
    antwoord: "Bezettingsgraad is 88% (70/80 units). Westerdok Kantoren heeft de meeste leegstand (3 van 12 units).",
    domein: "rapportage",
  },
  {
    id: "ch4",
    timestamp: "2026-03-17 16:45",
    vraag: "Stuur welkomstpakket naar nieuwe huurder 3B",
    antwoord: "Welkomstpakket opgesteld voor unit 3B, Westerdok Kantoren. Bevat huisregels, contactinfo en sleutelinformatie. Klaar voor verzending.",
    domein: "communicatie",
  },
  {
    id: "ch5",
    timestamp: "2026-03-17 09:20",
    vraag: "Welke contracten moeten verlengd worden?",
    antwoord: "3 contracten zijn verlopen en moeten verlengd: Maria Bakker, Jan de Vries, Lisa Jansen. Ik heb verlengingsvoorstellen met CPI-indexatie opgesteld.",
    domein: "contracten",
  },
];
