export interface AgentActivity {
  id: string;
  type: "incasso" | "communicatie" | "onderhoud" | "rapport";
  beschrijving: string;
  tijdstip: string;
  status: "voltooid" | "in_uitvoering" | "gepland";
}

export const agentActivities: AgentActivity[] = [
  {
    id: "a1",
    type: "incasso",
    beschrijving: "Betalingsherinnering verstuurd aan Ahmed El Amrani",
    tijdstip: "2 uur geleden",
    status: "voltooid",
  },
  {
    id: "a2",
    type: "rapport",
    beschrijving: "Dagrapportage gegenereerd: 19 maart 2026",
    tijdstip: "4 uur geleden",
    status: "voltooid",
  },
  {
    id: "a3",
    type: "onderhoud",
    beschrijving: "Onderhoudsticket aangemaakt: lekkende kraan unit 2A",
    tijdstip: "Gisteren",
    status: "in_uitvoering",
  },
  {
    id: "a4",
    type: "incasso",
    beschrijving: "Automatische incasso verwerkt: 8 van 10 facturen betaald",
    tijdstip: "3 dagen geleden",
    status: "voltooid",
  },
  {
    id: "a5",
    type: "communicatie",
    beschrijving: "Welkomstbericht verstuurd aan nieuwe huurder Lisa Jansen",
    tijdstip: "4 dagen geleden",
    status: "voltooid",
  },
  {
    id: "a6",
    type: "onderhoud",
    beschrijving: "Jaarlijkse CV-ketel inspectie ingepland: De Parmentier",
    tijdstip: "5 dagen geleden",
    status: "gepland",
  },
  {
    id: "a7",
    type: "rapport",
    beschrijving: "Wekelijks bezettingsoverzicht gegenereerd",
    tijdstip: "1 week geleden",
    status: "voltooid",
  },
];
