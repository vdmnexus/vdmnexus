export interface Pand {
  id: string;
  naam: string;
  adres: string;
  type: "woning" | "bedrijf" | "gemengd";
  units: number;
  bezet: number;
}

export interface Huurder {
  id: string;
  naam: string;
  email: string;
  pandId: string;
  unitNr: string;
  contractStart: string;
  contractEinde: string;
  huurprijs: number;
}

export interface Factuur {
  id: string;
  huurderId: string;
  pandId: string;
  periode: string;
  bedrag: number;
  status: "open" | "betaald" | "verlopen";
  vervalDatum: string;
}

export const panden: Pand[] = [
  {
    id: "p1",
    naam: "De Parmentier",
    adres: "Parmentierstraat 12, 1071 BA Amsterdam",
    type: "gemengd",
    units: 24,
    bezet: 22,
  },
  {
    id: "p2",
    naam: "Keizersgracht 440",
    adres: "Keizersgracht 440, 1016 GD Amsterdam",
    type: "woning",
    units: 8,
    bezet: 8,
  },
  {
    id: "p3",
    naam: "Westerdok Kantoren",
    adres: "Westerdoksdijk 15, 1013 AZ Amsterdam",
    type: "bedrijf",
    units: 12,
    bezet: 9,
  },
  {
    id: "p4",
    naam: "Van Hallstraat Appartementen",
    adres: "Van Hallstraat 88, 1051 HH Amsterdam",
    type: "woning",
    units: 16,
    bezet: 14,
  },
  {
    id: "p5",
    naam: "Zuidas Business Center",
    adres: "Gustav Mahlerlaan 2, 1082 MC Amsterdam",
    type: "bedrijf",
    units: 20,
    bezet: 17,
  },
];

export const huurders: Huurder[] = [
  {
    id: "h1",
    naam: "Jan de Vries",
    email: "j.devries@email.nl",
    pandId: "p1",
    unitNr: "A-101",
    contractStart: "2023-01-01",
    contractEinde: "2025-12-31",
    huurprijs: 1450,
  },
  {
    id: "h2",
    naam: "Maria Bakker",
    email: "m.bakker@email.nl",
    pandId: "p1",
    unitNr: "A-202",
    contractStart: "2022-06-01",
    contractEinde: "2025-05-31",
    huurprijs: 1625,
  },
  {
    id: "h3",
    naam: "TechFlow BV",
    email: "info@techflow.nl",
    pandId: "p1",
    unitNr: "B-001",
    contractStart: "2024-01-01",
    contractEinde: "2028-12-31",
    huurprijs: 3200,
  },
  {
    id: "h4",
    naam: "Sophie van den Berg",
    email: "s.vandenberg@email.nl",
    pandId: "p2",
    unitNr: "1A",
    contractStart: "2023-03-01",
    contractEinde: "2026-02-28",
    huurprijs: 1875,
  },
  {
    id: "h5",
    naam: "Ahmed El Amrani",
    email: "a.elamrani@email.nl",
    pandId: "p2",
    unitNr: "2B",
    contractStart: "2024-06-01",
    contractEinde: "2026-05-31",
    huurprijs: 1950,
  },
  {
    id: "h6",
    naam: "Digital Agency Noord",
    email: "office@danrd.nl",
    pandId: "p3",
    unitNr: "3.01",
    contractStart: "2023-09-01",
    contractEinde: "2028-08-31",
    huurprijs: 4500,
  },
  {
    id: "h7",
    naam: "Lisa Jansen",
    email: "l.jansen@email.nl",
    pandId: "p4",
    unitNr: "4C",
    contractStart: "2024-02-01",
    contractEinde: "2026-01-31",
    huurprijs: 1350,
  },
  {
    id: "h8",
    naam: "Innovate Labs BV",
    email: "contact@innovatelabs.nl",
    pandId: "p5",
    unitNr: "10.02",
    contractStart: "2023-07-01",
    contractEinde: "2027-06-30",
    huurprijs: 5800,
  },
  {
    id: "h9",
    naam: "Peter Willems",
    email: "p.willems@email.nl",
    pandId: "p4",
    unitNr: "2A",
    contractStart: "2022-11-01",
    contractEinde: "2025-10-31",
    huurprijs: 1275,
  },
  {
    id: "h10",
    naam: "Green Ventures BV",
    email: "hello@greenventures.nl",
    pandId: "p5",
    unitNr: "8.01",
    contractStart: "2024-04-01",
    contractEinde: "2029-03-31",
    huurprijs: 6200,
  },
];

export const facturen: Factuur[] = [
  {
    id: "f1",
    huurderId: "h1",
    pandId: "p1",
    periode: "Maart 2026",
    bedrag: 1450,
    status: "open",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f2",
    huurderId: "h2",
    pandId: "p1",
    periode: "Maart 2026",
    bedrag: 1625,
    status: "betaald",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f3",
    huurderId: "h3",
    pandId: "p1",
    periode: "Maart 2026",
    bedrag: 3200,
    status: "betaald",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f4",
    huurderId: "h4",
    pandId: "p2",
    periode: "Maart 2026",
    bedrag: 1875,
    status: "open",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f5",
    huurderId: "h5",
    pandId: "p2",
    periode: "Februari 2026",
    bedrag: 1950,
    status: "verlopen",
    vervalDatum: "2026-02-28",
  },
  {
    id: "f6",
    huurderId: "h6",
    pandId: "p3",
    periode: "Maart 2026",
    bedrag: 4500,
    status: "betaald",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f7",
    huurderId: "h7",
    pandId: "p4",
    periode: "Maart 2026",
    bedrag: 1350,
    status: "open",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f8",
    huurderId: "h8",
    pandId: "p5",
    periode: "Maart 2026",
    bedrag: 5800,
    status: "betaald",
    vervalDatum: "2026-03-31",
  },
  {
    id: "f9",
    huurderId: "h9",
    pandId: "p4",
    periode: "Februari 2026",
    bedrag: 1275,
    status: "verlopen",
    vervalDatum: "2026-02-28",
  },
  {
    id: "f10",
    huurderId: "h10",
    pandId: "p5",
    periode: "Maart 2026",
    bedrag: 6200,
    status: "open",
    vervalDatum: "2026-03-31",
  },
];

export interface OnderhoudTicket {
  id: string;
  pandId: string;
  unitNr: string;
  omschrijving: string;
  prioriteit: "laag" | "normaal" | "hoog" | "urgent";
  status: "open" | "in_behandeling" | "afgerond";
  aangemaaktOp: string;
}

export const onderhoudTickets: OnderhoudTicket[] = [
  {
    id: "ot1",
    pandId: "p4",
    unitNr: "2A",
    omschrijving: "Lekkende kraan in de keuken",
    prioriteit: "normaal",
    status: "in_behandeling",
    aangemaaktOp: "2026-03-18",
  },
  {
    id: "ot2",
    pandId: "p1",
    unitNr: "A-101",
    omschrijving: "Verwarming werkt niet op volle capaciteit",
    prioriteit: "hoog",
    status: "open",
    aangemaaktOp: "2026-03-17",
  },
  {
    id: "ot3",
    pandId: "p2",
    unitNr: "1A",
    omschrijving: "Intercom defect bij voordeur",
    prioriteit: "normaal",
    status: "open",
    aangemaaktOp: "2026-03-15",
  },
  {
    id: "ot4",
    pandId: "p1",
    unitNr: "B-001",
    omschrijving: "Jaarlijkse CV-ketel inspectie",
    prioriteit: "laag",
    status: "afgerond",
    aangemaaktOp: "2026-03-10",
  },
];

// Helper functions
export function getPand(id: string) {
  return panden.find((p) => p.id === id);
}

export function getHuurder(id: string) {
  return huurders.find((h) => h.id === id);
}

export function getFactuur(id: string) {
  return facturen.find((f) => f.id === id);
}

export function getHuurdersVoorPand(pandId: string) {
  return huurders.filter((h) => h.pandId === pandId);
}

export function getFacturenVoorHuurder(huurderId: string) {
  return facturen.filter((f) => f.huurderId === huurderId);
}

export function getFacturenVoorPand(pandId: string) {
  return facturen.filter((f) => f.pandId === pandId);
}

export function getBezettingsgraad() {
  const totaalUnits = panden.reduce((sum, p) => sum + p.units, 0);
  const totaalBezet = panden.reduce((sum, p) => sum + p.bezet, 0);
  return Math.round((totaalBezet / totaalUnits) * 100);
}

export function getOpenFacturenBedrag() {
  return facturen
    .filter((f) => f.status === "open" || f.status === "verlopen")
    .reduce((sum, f) => sum + f.bedrag, 0);
}
