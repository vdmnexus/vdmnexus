export type VoorstelStatus = "wachtend" | "goedgekeurd" | "afgewezen" | "uitgevoerd" | "zelf";
export type VoorstelActie = "verstuur" | "download" | "aanmaken" | "verlengen" | "escaleer";

export interface AgentVoorstel {
  id: string;
  domein: string;
  actie: VoorstelActie;
  titel: string;
  beschrijving: string;
  status: VoorstelStatus;
  details?: Record<string, string | number>;
  agentAanpak: string;
  zelfStappen: string[];
}

export const incassoVoorstellen: AgentVoorstel[] = [
  {
    id: "iv1",
    domein: "incasso",
    actie: "verstuur",
    titel: "Urgente herinnering — Ahmed El Amrani",
    beschrijving: "Factuur februari 2026 (€1.950) is 19 dagen verlopen. Ik heb een urgente betalingsherinnering opgesteld.",
    status: "wachtend",
    details: { bedrag: 1950, dagen_verlopen: 19 },
    agentAanpak: "Ik verstuur automatisch een urgente betalingsherinnering per e-mail naar a.elamrani@email.nl. Het bericht bevat het factuurnummer, het openstaande bedrag en een betalingsdeadline van 7 dagen.",
    zelfStappen: [
      "Open de factuur in het boekhoudpakket",
      "Neem telefonisch contact op met Ahmed El Amrani",
      "Bespreek de reden van de achterstand",
      "Maak eventueel een betalingsregeling",
      "Markeer als afgehandeld wanneer betaald of regeling getroffen",
    ],
  },
  {
    id: "iv2",
    domein: "incasso",
    actie: "verstuur",
    titel: "Urgente herinnering — Peter Willems",
    beschrijving: "Factuur februari 2026 (€1.275) is 19 dagen verlopen. Ik heb een urgente betalingsherinnering opgesteld.",
    status: "wachtend",
    details: { bedrag: 1275, dagen_verlopen: 19 },
    agentAanpak: "Ik verstuur automatisch een urgente betalingsherinnering per e-mail naar p.willems@email.nl met dezelfde opzet als hierboven.",
    zelfStappen: [
      "Open de factuur in het boekhoudpakket",
      "Neem contact op met Peter Willems",
      "Bespreek de betalingsachterstand",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "iv3",
    domein: "incasso",
    actie: "verstuur",
    titel: "Betalingsherinnering — Jan de Vries",
    beschrijving: "Factuur maart 2026 (€1.450) is open. Standaard herinnering klaar om te versturen.",
    status: "wachtend",
    details: { bedrag: 1450 },
    agentAanpak: "Ik verstuur een standaard betalingsherinnering per e-mail naar j.devries@email.nl. Vriendelijke toon, deadline einde maand.",
    zelfStappen: [
      "Stuur handmatig een herinneringsmail",
      "Of bel Jan de Vries voor een persoonlijke herinnering",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "iv4",
    domein: "incasso",
    actie: "verstuur",
    titel: "Betalingsherinnering — Sophie van den Berg",
    beschrijving: "Factuur maart 2026 (€1.875) is open. Standaard herinnering klaar om te versturen.",
    status: "wachtend",
    details: { bedrag: 1875 },
    agentAanpak: "Ik verstuur een standaard betalingsherinnering per e-mail naar s.vandenberg@email.nl.",
    zelfStappen: [
      "Stuur handmatig een herinneringsmail",
      "Markeer als afgehandeld wanneer betaald",
    ],
  },
];

export const onderhoudVoorstellen: AgentVoorstel[] = [
  {
    id: "ov1",
    domein: "onderhoud",
    actie: "escaleer",
    titel: "Escaleer — Verwarming A-101",
    beschrijving: "Ticket 'verwarming werkt niet op volle capaciteit' staat al 2 dagen open met hoge prioriteit. Ik stel voor om de installateur direct in te schakelen.",
    status: "wachtend",
    agentAanpak: "Ik stuur direct een opdracht naar de vaste installateur (Klimaat Service BV) met de ticketdetails en vraag om een spoedafspraak binnen 24 uur. Jan de Vries wordt per e-mail op de hoogte gesteld.",
    zelfStappen: [
      "Bel de installateur zelf om een afspraak in te plannen",
      "Informeer de huurder (Jan de Vries) over de planning",
      "Update het ticket met de afspraakgegevens",
      "Markeer als afgehandeld na reparatie",
    ],
  },
  {
    id: "ov2",
    domein: "onderhoud",
    actie: "verstuur",
    titel: "Statusupdate — Lekkende kraan 2A",
    beschrijving: "Loodgieter is ingepland voor morgen 10:00. Ik heb een bevestiging opgesteld voor Peter Willems.",
    status: "wachtend",
    agentAanpak: "Ik verstuur een e-mail naar Peter Willems met de bevestiging: loodgieter komt morgen om 10:00. Bevat contactgegevens van de loodgieter en instructies.",
    zelfStappen: [
      "Bel of app Peter Willems met de afspraakbevestiging",
      "Zorg dat de loodgieter de juiste unit en contactgegevens heeft",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "ov3",
    domein: "onderhoud",
    actie: "aanmaken",
    titel: "Planmatig onderhoud — CV-inspectie",
    beschrijving: "De jaarlijkse CV-ketel inspectie voor Keizersgracht 440 staat gepland. Ik kan afspraken inplannen voor alle 8 units.",
    status: "wachtend",
    agentAanpak: "Ik neem contact op met het onderhoudsbedrijf, plan 8 afspraken in over 2 dagen, en stuur automatisch bevestigingsmails naar alle huurders met hun tijdslot.",
    zelfStappen: [
      "Bel het onderhoudsbedrijf om data te plannen",
      "Verdeel de 8 units over de beschikbare tijdslots",
      "Stuur individuele mails naar alle huurders",
      "Markeer als afgehandeld na planning",
    ],
  },
];

export const communicatieVoorstellen: AgentVoorstel[] = [
  {
    id: "cv1",
    domein: "communicatie",
    actie: "verstuur",
    titel: "Onderhoudsbericht — Lift De Parmentier",
    beschrijving: "Lift A onderhoud gepland op 29 maart. Ik heb een bericht opgesteld voor alle 22 huurders van De Parmentier.",
    status: "wachtend",
    agentAanpak: "Ik verstuur het bericht per e-mail naar alle 22 huurders. Het bericht informeert over het liftonderhoud op 29 maart van 09:00 tot 15:00 en dat lift B beschikbaar blijft.",
    zelfStappen: [
      "Review het conceptbericht en pas aan waar nodig",
      "Verstuur handmatig via e-mail of hang een mededeling op in de hal",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "cv2",
    domein: "communicatie",
    actie: "verstuur",
    titel: "Welkomstpakket — Nieuwe huurder unit 3B",
    beschrijving: "Er is een nieuwe huurder voor unit 3B (Westerdok Kantoren). Welkomstbericht met huisregels en contactinfo is klaar.",
    status: "wachtend",
    agentAanpak: "Ik verstuur het welkomstpakket per e-mail met: huisregels, contactgegevens beheer, info over afvalinzameling, en noodprocedures.",
    zelfStappen: [
      "Print het welkomstpakket en lever het persoonlijk af",
      "Plan een kennismakingsgesprek in",
      "Geef een rondleiding door het pand",
      "Markeer als afgehandeld",
    ],
  },
];

export const rapportageVoorstellen: AgentVoorstel[] = [
  {
    id: "rv1",
    domein: "rapportage",
    actie: "download",
    titel: "Dagrapportage — 19 maart 2026",
    beschrijving: "Overzicht van bezetting (88%), openstaande facturen (€10.875), en 3 openstaande onderhoudstickets.",
    status: "wachtend",
    agentAanpak: "Ik genereer een PDF-rapport met alle dagelijkse KPI's en sla deze op in de documenten-map. Het rapport wordt ook per e-mail naar je verzonden.",
    zelfStappen: [
      "Bekijk de data in het Rapportage-domein",
      "Maak eventueel een eigen samenvatting",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "rv2",
    domein: "rapportage",
    actie: "download",
    titel: "Maandoverzicht — Februari 2026",
    beschrijving: "Financieel overzicht: €28.925 geïnd, 2 verlopen facturen (€3.225), bezettingsgraad stabiel op 88%.",
    status: "wachtend",
    agentAanpak: "Ik genereer een uitgebreid maandrapport met financiële analyse, bezettingstrends en vergelijking met vorige maand. Beschikbaar als PDF.",
    zelfStappen: [
      "Exporteer de financiële data uit het boekhoudpakket",
      "Stel zelf een maandoverzicht samen",
      "Markeer als afgehandeld",
    ],
  },
];

export const contractVoorstellen: AgentVoorstel[] = [
  {
    id: "ctv1",
    domein: "contracten",
    actie: "verlengen",
    titel: "Verlengingsvoorstel — Maria Bakker",
    beschrijving: "Contract loopt af op 31 mei 2025 (verlopen). Ik heb een verlengingsvoorstel opgesteld met 3,1% huurverhoging conform CPI.",
    status: "wachtend",
    details: { huidige_huur: 1625, nieuwe_huur: 1675 },
    agentAanpak: "Ik verstuur een formeel verlengingsvoorstel per e-mail naar Maria Bakker. Het voorstel bevat de nieuwe huurprijs (€1.675, +3,1% CPI), een nieuw contractperiode van 2 jaar, en een reactietermijn van 14 dagen.",
    zelfStappen: [
      "Bereken de gewenste huurverhoging",
      "Stel een verlengingsbrief op",
      "Verstuur per post of e-mail",
      "Plan een gesprek in om de verlenging te bespreken",
      "Markeer als afgehandeld na ondertekening",
    ],
  },
  {
    id: "ctv2",
    domein: "contracten",
    actie: "verlengen",
    titel: "Verlengingsvoorstel — Jan de Vries",
    beschrijving: "Contract loopt af op 31 december 2025 (verlopen). Verlengingsvoorstel met indexatie klaar voor verzending.",
    status: "wachtend",
    details: { huidige_huur: 1450, nieuwe_huur: 1495 },
    agentAanpak: "Ik verstuur een verlengingsvoorstel naar Jan de Vries met nieuwe huurprijs €1.495 (+3,1% CPI), contractperiode 2 jaar, reactietermijn 14 dagen.",
    zelfStappen: [
      "Neem contact op met Jan de Vries over de verlenging",
      "Bespreek de huurverhoging persoonlijk",
      "Stel het contract op",
      "Markeer als afgehandeld",
    ],
  },
  {
    id: "ctv3",
    domein: "contracten",
    actie: "verstuur",
    titel: "Herinnering opzegtermijn — Lisa Jansen",
    beschrijving: "Contract eindigt 31 januari 2026 (verlopen). Nog geen verlenging of opzegging ontvangen. Ik stel voor contact op te nemen.",
    status: "wachtend",
    agentAanpak: "Ik stuur een e-mail naar Lisa Jansen met het verzoek om aan te geven of zij het contract wil verlengen of opzeggen. Reactietermijn: 7 dagen.",
    zelfStappen: [
      "Bel Lisa Jansen om de situatie te bespreken",
      "Vraag naar haar plannen (verlengen of opzeggen)",
      "Handel het contract administratief af",
      "Markeer als afgehandeld",
    ],
  },
];
