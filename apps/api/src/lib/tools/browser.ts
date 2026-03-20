import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { registerTool } from "./registry.js";

const exec = promisify(execFile);

const RUSHFILES_URL = "https://my.rushfiles.net";
const SESSION_NAME = "rushfiles";
const BROWSER_TIMEOUT = 30_000;

// Run an agent-browser command and return stdout
async function ab(...args: string[]): Promise<string> {
  try {
    const { stdout } = await exec("agent-browser", args, {
      timeout: BROWSER_TIMEOUT,
      env: {
        ...process.env,
        AGENT_BROWSER_SESSION_NAME: SESSION_NAME,
      },
    });
    return stdout.trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Browser fout: ${message}`);
  }
}

// Ensure we're logged into RushFiles
async function ensureLoggedIn(): Promise<void> {
  const url = await ab("get", "url");

  // If already on rushfiles and logged in, great
  if (url.includes("my.rushfiles.net/my-account")) return;

  // Navigate to RushFiles
  await ab("open", RUSHFILES_URL);
  await ab("wait", "--load", "networkidle");

  const snapshot = await ab("snapshot", "-i", "-c");

  // Check if we're on login page
  if (snapshot.includes('textbox "Username"')) {
    const username = process.env.RUSHFILES_USERNAME ?? "";
    const password = process.env.RUSHFILES_PASSWORD ?? "";

    if (!username || !password) {
      throw new Error("RushFiles credentials niet geconfigureerd (RUSHFILES_USERNAME, RUSHFILES_PASSWORD).");
    }

    // Fill username
    await ab("fill", '@e7', username);
    await ab("click", '@e8'); // NEXT button
    await ab("wait", "2000");

    // Get new snapshot for password field
    const snap2 = await ab("snapshot", "-i", "-c");

    // Find password field and login button by searching snapshot
    if (snap2.includes('textbox "Password"')) {
      // Password field ref may vary, find it
      const pwMatch = snap2.match(/textbox "Password" \[ref=(e\d+)\]/);
      const loginMatch = snap2.match(/button "LOG IN" \[ref=(e\d+)\]/);

      if (pwMatch && loginMatch) {
        await ab("fill", `@${pwMatch[1]}`, password);
        await ab("click", `@${loginMatch[1]}`);
        await ab("wait", "4000");
        await ab("wait", "--load", "networkidle");
      }
    }
  }

  // Verify we're logged in
  const finalUrl = await ab("get", "url");
  if (!finalUrl.includes("my.rushfiles.net/my-account")) {
    throw new Error("RushFiles login mislukt. Controleer de credentials.");
  }
}

export function registerBrowserTools(): void {
  // 1. Browse RushFiles — navigate and list folder contents
  registerTool({
    name: "browser_rushfiles_browse",
    description: "Bekijk de mappenstructuur in RushFiles via de browser. Kan navigeren naar mappen en de inhoud tonen (bestandsnamen, datums, groottes).",
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Wat te doen: 'list_shares' om shares te tonen, 'open_folder' om een map te openen (klik op mapnaam), 'next_page' voor volgende pagina",
          enum: ["list_shares", "open_folder", "next_page", "go_back"],
        },
        folder_name: {
          type: "string",
          description: "Naam van de map om te openen (alleen bij action='open_folder'). Moet exact overeenkomen met een mapnaam in de huidige weergave.",
        },
      },
      required: ["action"],
    },
    execute: async (input) => {
      try {
        await ensureLoggedIn();
        const action = input.action as string;

        if (action === "list_shares") {
          // Navigate to share list
          await ab("open", `${RUSHFILES_URL}/my-account/share-list`);
          await ab("wait", "--load", "networkidle");
          const snapshot = await ab("snapshot", "-c");
          return parseShareList(snapshot);
        }

        if (action === "open_folder") {
          const folderName = input.folder_name as string;
          if (!folderName) return "Geef een mapnaam op met folder_name.";

          // Find the folder link in current snapshot
          const snapshot = await ab("snapshot", "-c");
          const linkMatch = snapshot.match(new RegExp(`link "${escapeRegex(folderName)}" \\[ref=(e\\d+)\\]`));

          if (!linkMatch) {
            return `Map "${folderName}" niet gevonden in de huidige weergave. Beschikbare items:\n${extractFileNames(snapshot)}`;
          }

          await ab("click", `@${linkMatch[1]}`);
          await ab("wait", "2000");
          await ab("wait", "--load", "networkidle");

          const newSnapshot = await ab("snapshot", "-c");
          return parseFolderContents(newSnapshot);
        }

        if (action === "next_page") {
          const snapshot = await ab("snapshot", "-i", "-c");
          const nextMatch = snapshot.match(/button "Next page" \[ref=(e\d+)\]/);
          if (!nextMatch || snapshot.includes('button "Next page" [disabled')) {
            return "Er is geen volgende pagina.";
          }
          await ab("click", `@${nextMatch[1]}`);
          await ab("wait", "2000");
          await ab("wait", "--load", "networkidle");
          const newSnapshot = await ab("snapshot", "-c");
          return parseFolderContents(newSnapshot);
        }

        if (action === "go_back") {
          await ab("back");
          await ab("wait", "2000");
          await ab("wait", "--load", "networkidle");
          const newSnapshot = await ab("snapshot", "-c");
          return parseFolderContents(newSnapshot);
        }

        return `Onbekende actie: ${action}`;
      } catch (err) {
        return `Browser fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  // 2. Search RushFiles
  registerTool({
    name: "browser_rushfiles_search",
    description: "Zoek naar bestanden of mappen in RushFiles via de zoekfunctie in de browser.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Zoekterm (bijv. 'huurcontract', 'factuur', 'inspectie')",
        },
      },
      required: ["query"],
    },
    execute: async (input) => {
      try {
        await ensureLoggedIn();
        const query = input.query as string;

        // Find search box and search
        const snapshot = await ab("snapshot", "-i", "-c");
        const searchMatch = snapshot.match(/textbox "Search\.\.\." \[ref=(e\d+)\]/);
        if (!searchMatch) {
          return "Zoekfunctie niet gevonden op de huidige pagina. Navigeer eerst naar een share.";
        }

        await ab("fill", `@${searchMatch[1]}`, query);

        // Find and click search button
        const snap2 = await ab("snapshot", "-i", "-c");
        const searchBtn = snap2.match(/button "Search" \[ref=(e\d+)\]/);
        if (searchBtn) {
          await ab("click", `@${searchBtn[1]}`);
        } else {
          await ab("press", "Enter");
        }

        await ab("wait", "3000");
        await ab("wait", "--load", "networkidle");

        const results = await ab("snapshot", "-c");
        return parseSearchResults(results, query);
      } catch (err) {
        return `Zoekfout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  console.log("Browser tools registered (2 tools)");
}

// ─── Parsers ────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseShareList(snapshot: string): string {
  const rows = snapshot.match(/gridcell "([^"]+)"/g) ?? [];
  if (rows.length === 0) return "Geen shares gevonden.";

  // Extract share info from rows
  const lines: string[] = ["Beschikbare RushFiles shares:\n"];
  const cells = rows.map((r) => r.match(/gridcell "([^"]+)"/)?.[1] ?? "");

  // Cells come in groups of 4: name, users, account, storage
  for (let i = 0; i < cells.length; i += 4) {
    const name = cells[i];
    const account = cells[i + 2] ?? "";
    const storage = cells[i + 3] ?? "";
    if (name) {
      lines.push(`- ${name} (${account}) — ${storage}`);
    }
  }

  return lines.join("\n");
}

function parseFolderContents(snapshot: string): string {
  // Extract current path from breadcrumbs
  const pathLinks = snapshot.match(/link "([^"]+)" \[ref=e\d+\]\s*\n\s*- StaticText/g) ?? [];
  const breadcrumbs = snapshot.match(/link "([^"]+)"/g)?.slice(0, 5) ?? [];

  // Extract file/folder rows
  const rows: { name: string; date: string; size: string; isFolder: boolean }[] = [];
  const rowMatches = [...snapshot.matchAll(/gridcell "([^"]+)" \[ref=e\d+\]\s*\n\s*- link/g)];
  const dateMatches = [...snapshot.matchAll(/gridcell "(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})"/g)];

  for (let i = 0; i < rowMatches.length; i++) {
    const name = rowMatches[i][1];
    const date = dateMatches[i]?.[1] ?? "";
    rows.push({ name, date, size: "", isFolder: true }); // folders don't show size in RushFiles
  }

  if (rows.length === 0) return "Deze map is leeg.";

  // Check pagination
  const showingMatch = snapshot.match(/Showing (\d+) to (\d+) from (\d+)/);
  const pageInfo = showingMatch ? `\n\n(${showingMatch[1]}-${showingMatch[2]} van ${showingMatch[3]} items)` : "";

  const lines: string[] = [`Mapinhoud (${rows.length} items):\n`];
  for (const row of rows) {
    lines.push(`- ${row.name}${row.date ? ` (${row.date})` : ""}`);
  }

  lines.push(pageInfo);
  return lines.join("\n");
}

function parseSearchResults(snapshot: string, query: string): string {
  const rows: string[] = [];
  const matches = [...snapshot.matchAll(/gridcell "([^"]+)" \[ref=e\d+\]\s*\n\s*- link/g)];

  for (const match of matches) {
    rows.push(match[1]);
  }

  if (rows.length === 0) return `Geen resultaten gevonden voor "${query}".`;

  const lines = [`Zoekresultaten voor "${query}" (${rows.length} items):\n`];
  for (const name of rows) {
    lines.push(`- ${name}`);
  }

  const showingMatch = snapshot.match(/Showing (\d+) to (\d+) from (\d+)/);
  if (showingMatch) lines.push(`\n(${showingMatch[1]}-${showingMatch[2]} van ${showingMatch[3]} items)`);

  return lines.join("\n");
}

function extractFileNames(snapshot: string): string {
  const matches = [...snapshot.matchAll(/gridcell "([^"]+)" \[ref=e\d+\]\s*\n\s*- link/g)];
  if (matches.length === 0) return "(geen items zichtbaar)";
  return matches.map((m) => `- ${m[1]}`).join("\n");
}
