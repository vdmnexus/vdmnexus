import { db } from "./index.js";
import { skills, employeeSkills, employees } from "./schema.js";
import { eq, and } from "drizzle-orm";

// Sophie's employee ID (VDM Vastgoed)
const SOPHIE_ID = "e1331c02-83de-4d57-a2a1-7d1c6edac567";

// ─── Pre-built skills (userId = null, herbruikbaar voor alle clients) ─────

const preBuiltSkills = [
  {
    name: "RushFiles Documentbeheer",
    description: "Zoek, refereer en beheer documenten in RushFiles. Specifiek voor VDM Vastgoed met de volledige mappenstructuur van de Vastgoed share.",
    config: {
      trigger: "Als iemand vraagt naar documenten, bestanden, contracten opzoeken, facturen terugvinden, of iets wil opslaan/delen in RushFiles",
      instructions: `Je helpt gebruikers met hun documentbeheer via RushFiles. Je kent de echte mappenstructuur van de VDM Vastgoed share.

## VDM Vastgoed RushFiles — Share "Vastgoed" (87 mappen)

### Huurder- en contractbeheer
- /Huurovereenkomsten/ — Huurcontracten per kantoor/huurder (submappen per huurder)
- /Nieuwe huurders/ — Documentatie voor nieuwe huurders
- /Opzeggingen huurders/ — Opzegdocumentatie en uitcheckprocessen
- /Huurders verklaringen verzekering/ — Verzekeringsverklaringen van huurders
- /Incasso formulieren/ — Incassoformulieren en machtigingen

### Financieel
- /Facturen/ — Facturen (inkomend/uitgaand)
- /Crediteuren/ — Crediteurendossiers
- /Debiteuren/ — Debiteurendossiers
- /Belastingdienst/ — Belastingzaken
- /Herziening btw vastgoed/ — BTW-herziening documentatie
- /Financiering VDM Vastgoed - Parmentierstraat te Hoogeveen/ — Financieringsdocumenten
- /Hypotheek Rozemanstraat Niels en Danielle/ — Hypotheekdossier
- /Familie Stak constructie/ — Familiestructuur/holding documentatie
- /Kamer van Koophandel 2024/ — KvK uittreksels en registraties

### Panden en locaties
- /Parmentierstraat 13/ — Dossier Parmentierstraat 13
- /Albert Rozemanstraat 26/ — Dossier Rozemanstraat
- /Buitenvaart 1011 - 26/ — Dossier Buitenvaart
- /Blokland Noordscheschut/ — Dossier Blokland
- /Julianastraat/ — Dossier Julianastraat
- /Nieuwbouw Parmentierstraat 2/ — Nieuwbouwproject
- /Parc le Duc/ — Dossier Parc le Duc
- /Zuidas Business Center/ — (indien aanwezig)

### Onderhoud en technisch
- /Faciltair Onderhouds plan Vastgoed/ — Facilitair onderhoudsplan
- /Electra/ — Elektrische installaties
- /Energie - meterstanden/ — Energiemeterstanden
- /Enexis Toldijk/ — Enexis aansluiting Toldijk
- /Brandblussers/ — Brandblusserdossiers en keuringen
- /Alarmsysteem en camerasysteem/ — Beveiligingssystemen
- /Riool/ — Rioolonderhoud
- /Laadpalen/ — Laadpaalinstallaties
- /Schuifhek Schuifpoort/ — Hek/poort documentatie
- /Internet en telefonie/ — Telecom/internet contracten

### Leveranciers en dienstverleners
- /Breukers/ — Leverancier Breukers
- /Feitse Panneman/ — Leverancier/dienstverlener
- /Fieten Olie/ — Leverancier Fieten Olie
- /Foris BV/ — Foris BV dossier
- /Koene Dirk Parmentierzaal/ — Parmentierzaal beheer
- /Makita/ — Gereedschap/materiaal

### Administratie en organisatie
- /Documenten/ — Algemene documenten
- /Fotos/ — Foto's van panden en units
- /Codes/ — Toegangscodes, sleutelbeheer
- /Procedures/ — Procedures en werkwijzen
- /Lonen beheer/ — Salarisadministratie
- /Personeel/ — Personeelsdossiers
- /Parmentier overleg/ — Vergadernotities en overlegstukken
- /Bouw aantekeningen/ — Bouwtechnische notities
- /Extra werkzaamheden Diederik & Regina/ — Specifieke werkzaamheden

### Overig
- /Afval/ — Afvalcontracten en -beheer
- /RDW/ — Voertuigregistratie
- /Marktplaats/ — Advertenties/verkoop
- /Merijn van der Meulen/ — Persoonlijk dossier

## Hoe te gebruiken

Als een gebruiker een document zoekt:
1. Bepaal de categorie (huur, financieel, onderhoud, pand)
2. Verwijs naar de juiste map hierboven
3. Gebruik de browser_rushfiles_browse tool om in RushFiles te navigeren als je de exacte locatie moet verifiëren
4. Bij huurovereenkomsten: /Huurovereenkomsten/[naam huurder of kantoor]/

Als een gebruiker een document wil opslaan:
1. Stel de juiste map voor op basis van het documenttype
2. Stel een consistente bestandsnaam voor
3. Bevestig de actie voordat je verder gaat`,
      outputFormat: "Geef altijd het volledige pad in RushFiles aan, bijv: /Vastgoed/Huurovereenkomsten/Kantoor A/Contract_JanDeVries.pdf",
      constraints: [
        "Verwijder of verplaats nooit documenten zonder expliciete bevestiging van een admin",
        "Geef altijd het volledige pad aan zodat de gebruiker het document kan vinden",
        "Bij twijfel over de locatie, gebruik de browser_rushfiles_browse tool om te verifiëren",
        "Browser tools zijn admin-only — alleen uitvoeren wanneer nodig voor documentzoekacties"
      ],
      dataAccess: ["panden", "huurders", "contracten", "rushfiles"],
    },
  },
  {
    name: "Huurincasso",
    description: "Beheer van facturen, betalingsherinneringen en achterstanden. Genereert herinneringen en overzichten.",
    config: {
      trigger: "Als iemand vraagt over facturen, betalingen, achterstanden, incasso, of herinneringen wil versturen",
      instructions: `Je beheert het volledige incassotraject:
1. Geef overzicht van openstaande en verlopen facturen
2. Stel professionele maar vriendelijke betalingsherinneringen op
3. Escaleer bij herhaaldelijke achterstand (eerst herinnering, dan aanmaning, dan incassobureau)
4. Bereken totalen en geef financieel overzicht

Bij een betalingsherinnering:
- Gebruik altijd de correcte naam, bedrag en periode
- Toon referentienummer en vervaldatum
- Houd een professionele maar toegankelijke toon
- Geef betalingsinstructies`,
      outputFormat: "Bij herinneringen: volledig opgemaakt bericht klaar om te versturen. Bij overzichten: tabelformaat met totalen.",
      constraints: [
        "Stuur nooit automatisch — altijd eerst ter goedkeuring voorleggen",
        "Bij bedragen boven €5.000 achterstand: adviseer persoonlijk contact",
        "Respecteer privacy — deel geen financiële info van huurder A met huurder B"
      ],
      dataAccess: ["facturen", "huurders", "panden"],
    },
  },
  {
    name: "Onderhoud",
    description: "Beheer van onderhoudstickets, meldingen, inspecties en escalaties.",
    config: {
      trigger: "Als iemand vraagt over reparaties, onderhoud, meldingen, tickets, inspecties of storingen",
      instructions: `Je beheert onderhoudsmeldingen en -tickets:
1. Bekijk openstaande tickets en hun status
2. Maak nieuwe tickets aan met juiste prioriteit
3. Escaleer urgente zaken (lekkage, verwarming uit in winter, etc.)
4. Plan periodieke inspecties
5. Stel updates op voor huurders over de voortgang`,
      outputFormat: "Tickets in overzichtelijk formaat met prioriteit, status en locatie.",
      constraints: [
        "Urgente zaken (waterlekkage, gaslek, geen verwarming in winter) altijd als URGENT markeren",
        "Bij veiligheidsrisico's: adviseer directe actie en evacuatie indien nodig"
      ],
      dataAccess: ["onderhoudTickets", "panden", "huurders"],
    },
  },
  {
    name: "Communicatie",
    description: "Opstellen van professionele berichten, brieven en nieuwsbrieven aan huurders.",
    config: {
      trigger: "Als iemand een bericht, brief, mail of nieuwsbrief wil sturen aan een huurder of groep huurders",
      instructions: `Je stelt professionele communicatie op:
1. Persoonlijke berichten aan individuele huurders
2. Groepsberichten aan alle huurders van een pand
3. Nieuwsbrieven voor de hele portefeuille

Toon: professioneel maar persoonlijk, niet te formeel. Gebruik altijd de naam van de huurder. Sluit af met contactgegevens.`,
      outputFormat: "Volledig opgemaakt bericht met aanhef, inhoud en afsluiting.",
      constraints: [
        "Altijd ter review voorleggen voordat het verstuurd wordt",
        "Gebruik de juiste aanhef (Beste/Geachte afhankelijk van relatie)",
        "Bij slecht nieuws (huurverhoging, onderhoud): empathische toon"
      ],
      dataAccess: ["huurders", "panden"],
    },
  },
  {
    name: "Rapportage",
    description: "Genereren van dag-, maand- en pandrapporten met KPIs en financiële overzichten.",
    config: {
      trigger: "Als iemand een rapport, overzicht of analyse wil van de portefeuille, een pand, of financiën",
      instructions: `Je genereert overzichtelijke rapporten:
1. Dagrapport: nieuwe tickets, betalingen, acties vandaag
2. Maandrapport: financieel overzicht, bezetting, onderhoud, contracten
3. Pandrapport: specifiek pand met alle details

Gebruik altijd actuele data. Bereken totalen en percentages. Signaleer afwijkingen en risico's.`,
      outputFormat: "Gestructureerd rapport met secties, cijfers en conclusies.",
      constraints: [
        "Wees eerlijk over negatieve trends — geen sugarcoating",
        "Rond bedragen af op hele euro's"
      ],
      dataAccess: ["panden", "huurders", "facturen", "onderhoudTickets"],
    },
  },
  {
    name: "Contractbeheer",
    description: "Beheer van huurcontracten, verlengingen, opzeggingen en compliance checks.",
    config: {
      trigger: "Als iemand vraagt over contracten, verlengingen, huurverhogingen, opzeggingen of contracttermijnen",
      instructions: `Je beheert het contractenproces:
1. Scan contracten op verloopdatums (signaleer 6 maanden vooruit)
2. Stel verlengingsvoorstellen op met CPI-indexatie
3. Verwerk opzeggingen en start het uitcheckproces
4. Controleer of contracten compliant zijn

Bij verlengingen: bereken de nieuwe huurprijs o.b.v. CPI-indexatie (huidig: 3,1%).
Bij opzeggingen: plan eindinspectie, borgterugbetaling, sleutelinlevering.`,
      outputFormat: "Bij voorstellen: volledig document. Bij scans: overzichtstabel.",
      constraints: [
        "Huurverhogingen moeten voldoen aan wettelijke maxima",
        "Opzegtermijn checken voordat opzegging verwerkt wordt",
        "Bij commerciële huurders: check contractuele opzegclausules"
      ],
      dataAccess: ["huurders", "panden", "contracten"],
    },
  },
  {
    name: "Portefeuille",
    description: "Analyse van de vastgoedportefeuille: bezetting, rendement, pandinfo en KPIs.",
    config: {
      trigger: "Als iemand vraagt over panden, bezettingsgraden, rendement, portefeuille-overzicht of panddetails",
      instructions: `Je analyseert de vastgoedportefeuille:
1. Bezettingsanalyse per pand en totaal
2. Rendementberekening (huurinkomsten vs. kosten)
3. Gedetailleerde pandinfo met alle huurders en status
4. Vergelijk panden onderling

Bereken altijd: bezettingsgraad (%), bruto huurinkomsten, openstaande bedragen.`,
      outputFormat: "Overzichtelijke analyse met cijfers, vergelijkingen en aanbevelingen.",
      constraints: [
        "Rendementcijfers zijn indicatief — vermeld dit altijd",
        "Bij lage bezetting (<80%): proactief signaleren"
      ],
      dataAccess: ["panden", "huurders", "facturen"],
    },
  },
];

async function seed() {
  console.log("Seeding pre-built skills...");

  for (const skillData of preBuiltSkills) {
    // Check if skill already exists (by name, pre-built = userId null)
    const existing = await db
      .select()
      .from(skills)
      .where(and(eq(skills.name, skillData.name), eq(skills.type, "pre-built")))
      .limit(1);

    if (existing[0]) {
      // Update existing skill config
      await db
        .update(skills)
        .set({ description: skillData.description, config: skillData.config })
        .where(eq(skills.id, existing[0].id));
      console.log(`  Updated: ${skillData.name}`);

      // Ensure linked to Sophie
      const linked = await db
        .select()
        .from(employeeSkills)
        .where(and(eq(employeeSkills.employeeId, SOPHIE_ID), eq(employeeSkills.skillId, existing[0].id)))
        .limit(1);

      if (!linked[0]) {
        await db.insert(employeeSkills).values({ employeeId: SOPHIE_ID, skillId: existing[0].id });
        console.log(`    → Linked to Sophie`);
      }
    } else {
      // Create new skill
      const [created] = await db
        .insert(skills)
        .values({
          userId: null, // pre-built
          name: skillData.name,
          description: skillData.description,
          type: "pre-built",
          config: skillData.config,
        })
        .returning();

      console.log(`  Created: ${skillData.name} (${created.id})`);

      // Link to Sophie
      await db.insert(employeeSkills).values({ employeeId: SOPHIE_ID, skillId: created.id });
      console.log(`    → Linked to Sophie`);
    }
  }

  // Set Sophie's model to Kimi (Moonshot) as test pilot
  console.log("\nSetting Sophie's model to kimi-k2.5...");
  await db
    .update(employees)
    .set({ model: "kimi-k2.5", updatedAt: new Date() })
    .where(eq(employees.id, SOPHIE_ID));
  console.log("  Done — Sophie now uses Kimi as LLM.");

  console.log("\nDone! All skills seeded and linked to Sophie.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
