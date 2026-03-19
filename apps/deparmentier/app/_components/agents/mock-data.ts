export interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

export interface Ticket {
  id: string;
  title: string;
  location: string;
  priority: "laag" | "gemiddeld" | "hoog" | "urgent";
  status: "gemeld" | "in_behandeling" | "opgelost";
  reportedAt: string;
  description: string;
}

export interface Broadcast {
  id: string;
  subject: string;
  body: string;
  channels: string[];
  sentAt: string;
}

export const receptieConversations: ChatMessage[][] = [
  [
    { role: "user", content: "Hallo, ik heb een afspraak met Jansen van unit 4B." },
    { role: "agent", content: "Welkom bij De Parmentier! Ik zoek even voor u op..." },
    { role: "agent", content: "Gevonden! Jansen Architecten in unit 4B. Ik stuur hen een melding dat u er bent. Mag ik uw naam?" },
    { role: "user", content: "Peter de Vries, van Bouwadvies BV." },
    { role: "agent", content: "Dank u, meneer De Vries. Ik heb Jansen Architecten op de hoogte gesteld. U kunt plaatsnemen in de lobby — ze komen u zo ophalen. Kan ik verder nog iets voor u doen?" },
  ],
  [
    { role: "user", content: "Ik kom een pakket bezorgen voor Creative Studio." },
    { role: "agent", content: "Creative Studio zit in unit 2A. Ik stuur hen een melding. Is het een groot pakket of past het in de brievenbus?" },
    { role: "user", content: "Het is een groot pakket, moet getekend worden." },
    { role: "agent", content: "Begrepen. Ik heb Creative Studio gevraagd om iemand naar de receptie te sturen voor ontvangst. Een moment geduld alstublieft." },
  ],
];

export const onderhoudTickets: Ticket[] = [
  {
    id: "OND-001",
    title: "Lekkage plafond gang 2e verdieping",
    location: "Gang 2e verdieping, bij unit 2C",
    priority: "hoog",
    status: "in_behandeling",
    reportedAt: "2026-03-18T09:30:00",
    description: "Water druppelt door het plafond na hevige regenval. Mogelijk daklek.",
  },
  {
    id: "OND-002",
    title: "Verlichting parkeergarage defect",
    location: "Parkeergarage niveau -1, sectie B",
    priority: "gemiddeld",
    status: "gemeld",
    reportedAt: "2026-03-19T14:15:00",
    description: "Drie TL-buizen in sectie B werken niet meer. Veiligheidsrisico bij slecht zicht.",
  },
  {
    id: "OND-003",
    title: "Airco unit 5A maakt geluid",
    location: "Unit 5A",
    priority: "laag",
    status: "opgelost",
    reportedAt: "2026-03-15T11:00:00",
    description: "Ratelend geluid uit de airco-unit. Filter was verstopt, is schoongemaakt.",
  },
];

export const communicatieBroadcasts: Broadcast[] = [
  {
    id: "COM-001",
    subject: "Gepland onderhoud lift A — 22 maart",
    body: "Beste huurders,\n\nOp zaterdag 22 maart wordt lift A onderhouden van 08:00 tot 14:00. Gebruik in deze periode lift B. Onze excuses voor het ongemak.\n\nMet vriendelijke groet,\nBeheer De Parmentier",
    channels: ["email", "slack", "whatsapp"],
    sentAt: "2026-03-19T10:00:00",
  },
  {
    id: "COM-002",
    subject: "Nieuwe vuilnisregeling per 1 april",
    body: "Beste huurders,\n\nVanaf 1 april gelden nieuwe ophaaldag voor afval. Restafval: dinsdag en vrijdag. PMD: woensdag. Papier: eerste maandag van de maand.\n\nZie het informatiebord in de lobby voor details.\n\nMet vriendelijke groet,\nBeheer De Parmentier",
    channels: ["email", "slack"],
    sentAt: "2026-03-17T15:30:00",
  },
];
