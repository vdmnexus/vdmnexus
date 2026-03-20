// Vastgoeddata context for Sophie's system prompt
// Currently uses mock data — replace with DB queries when real data is available

interface Pand {
  naam: string;
  adres: string;
  type: string;
  units: number;
  bezet: number;
}

interface Huurder {
  id: string;
  naam: string;
  email: string;
  pandId: string;
  unitNr: string;
  contractStart: string;
  contractEinde: string;
  huurprijs: number;
}

interface Factuur {
  huurderId: string;
  pandId: string;
  periode: string;
  bedrag: number;
  status: "open" | "betaald" | "verlopen";
  vervalDatum: string;
}

interface OnderhoudTicket {
  pandId: string;
  unitNr: string;
  omschrijving: string;
  prioriteit: string;
  status: string;
  aangemaaktOp: string;
}

const panden: Pand[] = [
  { naam: "De Parmentier", adres: "Parmentierstraat 12, 1071 BA Amsterdam", type: "gemengd", units: 24, bezet: 22 },
  { naam: "Keizersgracht 440", adres: "Keizersgracht 440, 1016 GD Amsterdam", type: "woning", units: 8, bezet: 8 },
  { naam: "Westerdok Kantoren", adres: "Westerdoksdijk 15, 1013 AZ Amsterdam", type: "bedrijf", units: 12, bezet: 9 },
  { naam: "Van Hallstraat Appartementen", adres: "Van Hallstraat 88, 1051 HH Amsterdam", type: "woning", units: 16, bezet: 14 },
  { naam: "Zuidas Business Center", adres: "Gustav Mahlerlaan 2, 1082 MC Amsterdam", type: "bedrijf", units: 20, bezet: 17 },
];

const huurders: Huurder[] = [
  { id: "h1", naam: "Jan de Vries", email: "j.devries@email.nl", pandId: "p1", unitNr: "A-101", contractStart: "2023-01-01", contractEinde: "2025-12-31", huurprijs: 1450 },
  { id: "h2", naam: "Maria Bakker", email: "m.bakker@email.nl", pandId: "p1", unitNr: "A-202", contractStart: "2022-06-01", contractEinde: "2025-05-31", huurprijs: 1625 },
  { id: "h3", naam: "TechFlow BV", email: "info@techflow.nl", pandId: "p1", unitNr: "B-001", contractStart: "2024-01-01", contractEinde: "2028-12-31", huurprijs: 3200 },
  { id: "h4", naam: "Sophie van den Berg", email: "s.vandenberg@email.nl", pandId: "p2", unitNr: "1A", contractStart: "2023-03-01", contractEinde: "2026-02-28", huurprijs: 1875 },
  { id: "h5", naam: "Ahmed El Amrani", email: "a.elamrani@email.nl", pandId: "p2", unitNr: "2B", contractStart: "2024-06-01", contractEinde: "2026-05-31", huurprijs: 1950 },
  { id: "h6", naam: "Digital Agency Noord", email: "office@danrd.nl", pandId: "p3", unitNr: "3.01", contractStart: "2023-09-01", contractEinde: "2028-08-31", huurprijs: 4500 },
  { id: "h7", naam: "Lisa Jansen", email: "l.jansen@email.nl", pandId: "p4", unitNr: "4C", contractStart: "2024-02-01", contractEinde: "2026-01-31", huurprijs: 1350 },
  { id: "h8", naam: "Innovate Labs BV", email: "contact@innovatelabs.nl", pandId: "p5", unitNr: "10.02", contractStart: "2023-07-01", contractEinde: "2027-06-30", huurprijs: 5800 },
  { id: "h9", naam: "Peter Willems", email: "p.willems@email.nl", pandId: "p4", unitNr: "2A", contractStart: "2022-11-01", contractEinde: "2025-10-31", huurprijs: 1275 },
  { id: "h10", naam: "Green Ventures BV", email: "hello@greenventures.nl", pandId: "p5", unitNr: "8.01", contractStart: "2024-04-01", contractEinde: "2029-03-31", huurprijs: 6200 },
];

const facturen: Factuur[] = [
  { huurderId: "h1", pandId: "p1", periode: "Maart 2026", bedrag: 1450, status: "open", vervalDatum: "2026-03-31" },
  { huurderId: "h2", pandId: "p1", periode: "Maart 2026", bedrag: 1625, status: "betaald", vervalDatum: "2026-03-31" },
  { huurderId: "h3", pandId: "p1", periode: "Maart 2026", bedrag: 3200, status: "betaald", vervalDatum: "2026-03-31" },
  { huurderId: "h4", pandId: "p2", periode: "Maart 2026", bedrag: 1875, status: "open", vervalDatum: "2026-03-31" },
  { huurderId: "h5", pandId: "p2", periode: "Februari 2026", bedrag: 1950, status: "verlopen", vervalDatum: "2026-02-28" },
  { huurderId: "h6", pandId: "p3", periode: "Maart 2026", bedrag: 4500, status: "betaald", vervalDatum: "2026-03-31" },
  { huurderId: "h7", pandId: "p4", periode: "Maart 2026", bedrag: 1350, status: "open", vervalDatum: "2026-03-31" },
  { huurderId: "h8", pandId: "p5", periode: "Maart 2026", bedrag: 5800, status: "betaald", vervalDatum: "2026-03-31" },
  { huurderId: "h9", pandId: "p4", periode: "Februari 2026", bedrag: 1275, status: "verlopen", vervalDatum: "2026-02-28" },
  { huurderId: "h10", pandId: "p5", periode: "Maart 2026", bedrag: 6200, status: "open", vervalDatum: "2026-03-31" },
];

const onderhoudTickets: OnderhoudTicket[] = [
  { pandId: "p4", unitNr: "2A", omschrijving: "Lekkende kraan in de keuken", prioriteit: "normaal", status: "in_behandeling", aangemaaktOp: "2026-03-18" },
  { pandId: "p1", unitNr: "A-101", omschrijving: "Verwarming werkt niet op volle capaciteit", prioriteit: "hoog", status: "open", aangemaaktOp: "2026-03-17" },
  { pandId: "p2", unitNr: "1A", omschrijving: "Intercom defect bij voordeur", prioriteit: "normaal", status: "open", aangemaaktOp: "2026-03-15" },
  { pandId: "p1", unitNr: "B-001", omschrijving: "Jaarlijkse CV-ketel inspectie", prioriteit: "laag", status: "afgerond", aangemaaktOp: "2026-03-10" },
];

const pandIdMap: Record<string, string> = { p1: "De Parmentier", p2: "Keizersgracht 440", p3: "Westerdok Kantoren", p4: "Van Hallstraat Appartementen", p5: "Zuidas Business Center" };
const huurderMap = new Map(huurders.map((h) => [h.id, h]));

export function buildVastgoedContext(): string {
  const today = new Date().toISOString().split("T")[0];
  const parts: string[] = [];

  parts.push(`## Actuele vastgoeddata (${today})`);

  // Panden
  parts.push("\n### Portefeuille overzicht");
  const totaalUnits = panden.reduce((s, p) => s + p.units, 0);
  const totaalBezet = panden.reduce((s, p) => s + p.bezet, 0);
  parts.push(`Totaal: ${panden.length} panden, ${totaalBezet}/${totaalUnits} units bezet (${Math.round((totaalBezet / totaalUnits) * 100)}%)\n`);
  for (const p of panden) {
    parts.push(`- **${p.naam}**: ${p.bezet}/${p.units} bezet, ${p.adres} (${p.type})`);
  }

  // Huurders
  parts.push("\n### Huurders");
  for (const h of huurders) {
    parts.push(`- ${h.naam} (${h.email}) — ${pandIdMap[h.pandId]} unit ${h.unitNr}, €${h.huurprijs.toLocaleString("nl-NL")}/mnd, contract ${h.contractStart} t/m ${h.contractEinde}`);
  }

  // Facturen
  const openFacturen = facturen.filter((f) => f.status !== "betaald");
  const openBedrag = openFacturen.reduce((s, f) => s + f.bedrag, 0);
  parts.push(`\n### Openstaande facturen (${openFacturen.length} stuks, totaal €${openBedrag.toLocaleString("nl-NL")})`);
  for (const f of facturen) {
    const huurder = huurderMap.get(f.huurderId);
    const statusLabel = f.status === "betaald" ? "BETAALD" : f.status === "verlopen" ? "VERLOPEN" : "OPEN";
    parts.push(`- ${huurder?.naam ?? "Onbekend"}: €${f.bedrag.toLocaleString("nl-NL")} (${f.periode}) — ${statusLabel}${f.status === "verlopen" ? ` sinds ${f.vervalDatum}` : ""}`);
  }

  // Onderhoud
  const openTickets = onderhoudTickets.filter((t) => t.status !== "afgerond");
  parts.push(`\n### Open onderhoudstickets (${openTickets.length} actief)`);
  for (const t of onderhoudTickets) {
    parts.push(`- ${t.omschrijving} — ${pandIdMap[t.pandId]} unit ${t.unitNr} — ${t.prioriteit} — ${t.status} (sinds ${t.aangemaaktOp})`);
  }

  // Contracten die binnenkort aflopen
  const binnenkort = huurders.filter((h) => {
    const einde = new Date(h.contractEinde);
    const nu = new Date();
    const maanden = (einde.getFullYear() - nu.getFullYear()) * 12 + einde.getMonth() - nu.getMonth();
    return maanden <= 6 && maanden >= 0;
  });
  if (binnenkort.length > 0) {
    parts.push(`\n### Contracten die binnen 6 maanden aflopen (${binnenkort.length})`);
    for (const h of binnenkort) {
      parts.push(`- ${h.naam} — ${pandIdMap[h.pandId]} unit ${h.unitNr} — eindigt ${h.contractEinde}`);
    }
  }

  return parts.join("\n");
}
