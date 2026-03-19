import {
  panden,
  huurders,
  facturen,
  getBezettingsgraad,
  getOpenFacturenBedrag,
  getHuurdersVoorPand,
  getFacturenVoorHuurder,
  type Factuur,
  type Pand,
  type OnderhoudTicket,
  onderhoudTickets,
} from "./mock-data";

export type RichContentType =
  | "facturen-tabel"
  | "panden-cards"
  | "huurder-detail"
  | "rapport"
  | "actie-bevestiging"
  | "onderhoud-tabel"
  | "bezetting-stats"
  | "contract-overzicht";

export interface AgentResponse {
  text: string;
  richContent?: {
    type: RichContentType;
    data: unknown;
  };
}

export function getAgentResponse(input: string): AgentResponse {
  const q = input.toLowerCase().trim();

  // Facturen / openstaand
  if (q.includes("factuur") || q.includes("facturen") || q.includes("openstaand")) {
    const openFacturen = facturen.filter(
      (f) => f.status === "open" || f.status === "verlopen"
    );
    const totaal = getOpenFacturenBedrag();
    return {
      text: `Er zijn ${openFacturen.length} openstaande facturen met een totaalbedrag van €${totaal.toLocaleString("nl-NL")}. Hieronder het overzicht:`,
      richContent: {
        type: "facturen-tabel",
        data: openFacturen.map((f) => ({
          ...f,
          huurderNaam: huurders.find((h) => h.id === f.huurderId)?.naam ?? "Onbekend",
          pandNaam: panden.find((p) => p.id === f.pandId)?.naam ?? "Onbekend",
        })),
      },
    };
  }

  // Panden / portefeuille
  if (q.includes("pand") || q.includes("portefeuille") || q.includes("vastgoed")) {
    const totaalUnits = panden.reduce((s, p) => s + p.units, 0);
    const totaalBezet = panden.reduce((s, p) => s + p.bezet, 0);
    return {
      text: `De portefeuille bestaat uit ${panden.length} panden met ${totaalUnits} units, waarvan ${totaalBezet} bezet (${getBezettingsgraad()}%).`,
      richContent: {
        type: "panden-cards",
        data: panden,
      },
    };
  }

  // Huurder + naam
  if (q.includes("huurder")) {
    const match = huurders.find((h) =>
      q.includes(h.naam.toLowerCase().split(" ")[0]!)
    );
    if (match) {
      const huurderFacturen = getFacturenVoorHuurder(match.id);
      const pand = panden.find((p) => p.id === match.pandId);
      return {
        text: `Hier zijn de gegevens van ${match.naam}:`,
        richContent: {
          type: "huurder-detail",
          data: { huurder: match, pand, facturen: huurderFacturen },
        },
      };
    }
    return {
      text: `Er zijn ${huurders.length} actieve huurders in de portefeuille. Noem een naam voor meer details, bijvoorbeeld: "huurder Jan" of "huurder Ahmed".`,
    };
  }

  // Bezetting
  if (q.includes("bezetting")) {
    return {
      text: `De totale bezettingsgraad is ${getBezettingsgraad()}%. Hier is de uitsplitsing per pand:`,
      richContent: {
        type: "bezetting-stats",
        data: panden.map((p) => ({
          naam: p.naam,
          units: p.units,
          bezet: p.bezet,
          percentage: Math.round((p.bezet / p.units) * 100),
        })),
      },
    };
  }

  // Herinnering / incasso
  if (q.includes("herinnering") || q.includes("incasso")) {
    const verlopen = facturen.filter((f) => f.status === "verlopen");
    const open = facturen.filter((f) => f.status === "open");
    const targets = [...verlopen, ...open];
    const namen = targets.map(
      (f) => huurders.find((h) => h.id === f.huurderId)?.naam
    );
    return {
      text: `Betalingsherinneringen verstuurd naar ${targets.length} huurders: ${namen.join(", ")}. Verlopen facturen krijgen een urgente herinnering.`,
      richContent: {
        type: "actie-bevestiging",
        data: {
          actie: "Herinneringen verstuurd",
          details: targets.map((f) => ({
            huurder: huurders.find((h) => h.id === f.huurderId)?.naam,
            bedrag: f.bedrag,
            status: f.status,
            periode: f.periode,
          })),
        },
      },
    };
  }

  // Onderhoud / melding
  if (q.includes("onderhoud") || q.includes("melding") || q.includes("ticket")) {
    return {
      text: `Er zijn ${onderhoudTickets.length} onderhoudstickets in het systeem:`,
      richContent: {
        type: "onderhoud-tabel",
        data: onderhoudTickets,
      },
    };
  }

  // Rapport / samenvatting
  if (q.includes("rapport") || q.includes("samenvatting") || q.includes("dagrapportage")) {
    const bezetting = getBezettingsgraad();
    const openBedrag = getOpenFacturenBedrag();
    const verlopenCount = facturen.filter((f) => f.status === "verlopen").length;
    const betaaldCount = facturen.filter((f) => f.status === "betaald").length;
    return {
      text: "Dagrapportage — 19 maart 2026:",
      richContent: {
        type: "rapport",
        data: {
          datum: "19 maart 2026",
          bezettingsgraad: bezetting,
          totaalPanden: panden.length,
          totaalHuurders: huurders.length,
          openstaandBedrag: openBedrag,
          verlopenFacturen: verlopenCount,
          betaaldeFacturen: betaaldCount,
          openTickets: onderhoudTickets.filter((t) => t.status !== "afgerond").length,
        },
      },
    };
  }

  // Contractbeheer
  if (q.includes("contract") || q.includes("verlenging") || q.includes("huurverhoging") || q.includes("opzeg") || q.includes("aflopend")) {
    const nu = new Date("2026-03-19");
    const binnenkortAflopend = huurders.filter((h) => {
      const einde = new Date(h.contractEinde);
      const maanden = (einde.getTime() - nu.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return maanden <= 6 && maanden > 0;
    });
    const verlopen = huurders.filter((h) => new Date(h.contractEinde) < nu);
    return {
      text: `Contractoverzicht: ${verlopen.length} verlopen contract(en) en ${binnenkortAflopend.length} contract(en) lopen binnen 6 maanden af.`,
      richContent: {
        type: "contract-overzicht",
        data: {
          verlopen: verlopen.map((h) => ({
            naam: h.naam,
            unitNr: h.unitNr,
            einde: h.contractEinde,
            huurprijs: h.huurprijs,
            pandNaam: panden.find((p) => p.id === h.pandId)?.naam,
          })),
          binnenkortAflopend: binnenkortAflopend.map((h) => ({
            naam: h.naam,
            unitNr: h.unitNr,
            einde: h.contractEinde,
            huurprijs: h.huurprijs,
            pandNaam: panden.find((p) => p.id === h.pandId)?.naam,
          })),
        },
      },
    };
  }

  // Bericht / mail / communicatie
  if (q.includes("bericht") || q.includes("mail") || q.includes("communicatie") || q.includes("schrijf")) {
    return {
      text: "Ik kan berichten opstellen en versturen naar huurders. Geef aan wat je wilt communiceren, bijvoorbeeld:\n\n• \"Schrijf een bericht over gepland onderhoud\"\n• \"Stuur een herinnering naar Ahmed El Amrani\"\n• \"Communiceer de jaarlijkse huurverhoging\"",
    };
  }

  // Default
  return {
    text: "Ik ben de VDM Vastgoed agent. Ik kan je helpen met:\n\n• **Facturen** — \"Welke facturen staan open?\"\n• **Panden** — \"Toon de portefeuille\"\n• **Huurders** — \"Huurder Jan\" voor details\n• **Bezetting** — \"Wat is de bezettingsgraad?\"\n• **Incasso** — \"Stuur herinneringen\"\n• **Onderhoud** — \"Openstaande onderhoudstickets?\"\n• **Rapportage** — \"Genereer dagrapportage\"\n• **Contracten** — \"Welke contracten lopen af?\"\n• **Communicatie** — \"Schrijf een bericht\"",
  };
}
