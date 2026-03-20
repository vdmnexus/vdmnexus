import { registerTool } from "./registry.js";

// ─── RushFiles Auth ─────────────────────────────────────

interface RushFilesToken {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
}

let cachedToken: RushFilesToken | null = null;

function getRushFilesConfig() {
  return {
    authUrl: process.env.RUSHFILES_AUTH_URL ?? "https://auth.rushfiles.com/connect/token",
    gatewayUrl: process.env.RUSHFILES_GATEWAY_URL ?? "https://clientgateway.rushfiles.dk",
    filecacheUrl: process.env.RUSHFILES_FILECACHE_URL ?? "https://filecache01.rushfiles.com",
    clientId: process.env.RUSHFILES_CLIENT_ID ?? "",
    clientSecret: process.env.RUSHFILES_CLIENT_SECRET ?? "",
    username: process.env.RUSHFILES_USERNAME ?? "",
    password: process.env.RUSHFILES_PASSWORD ?? "",
    defaultShareId: process.env.RUSHFILES_DEFAULT_SHARE_ID ?? "",
  };
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
    return cachedToken.accessToken;
  }

  const config = getRushFilesConfig();
  if (!config.clientId || !config.username) {
    throw new Error("RushFiles credentials niet geconfigureerd. Stel RUSHFILES_CLIENT_ID, RUSHFILES_CLIENT_SECRET, RUSHFILES_USERNAME en RUSHFILES_PASSWORD in.");
  }

  const params = new URLSearchParams({
    grant_type: cachedToken?.refreshToken ? "refresh_token" : "password",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "openid profile domain_api offline_access",
  });

  if (cachedToken?.refreshToken) {
    params.set("refresh_token", cachedToken.refreshToken);
  } else {
    params.set("username", config.username);
    params.set("password", config.password);
  }

  const res = await fetch(config.authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("RushFiles auth error:", errText);
    cachedToken = null;
    throw new Error("RushFiles authenticatie mislukt. Controleer de credentials.");
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

async function rushfilesFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

// ─── Helper: format file/folder listing ─────────────────

interface RfVirtualFile {
  InternalName: string;
  PublicName: string;
  IsFolder: boolean;
  Tick: number;
  EndOfFile?: number;
  CreationTime?: string;
  LastWriteTime?: string;
  ShareId?: string;
}

function formatFileList(files: RfVirtualFile[], path: string): string {
  if (files.length === 0) return `Map "${path}" is leeg.`;

  const folders = files.filter((f) => f.IsFolder);
  const docs = files.filter((f) => !f.IsFolder);

  const lines: string[] = [`Inhoud van "${path}" (${files.length} items):\n`];

  if (folders.length > 0) {
    lines.push(`📁 Mappen (${folders.length}):`);
    for (const f of folders) {
      lines.push(`  - ${f.PublicName}/`);
    }
  }

  if (docs.length > 0) {
    lines.push(`\n📄 Bestanden (${docs.length}):`);
    for (const f of docs) {
      const size = f.EndOfFile ? `${Math.round(f.EndOfFile / 1024)} KB` : "onbekend";
      const modified = f.LastWriteTime ? new Date(f.LastWriteTime).toLocaleDateString("nl-NL") : "";
      lines.push(`  - ${f.PublicName} (${size}${modified ? `, ${modified}` : ""})`);
    }
  }

  return lines.join("\n");
}

// ─── Tools ──────────────────────────────────────────────

export function registerRushFilesTools(): void {
  const config = getRushFilesConfig();

  // 1. List folder contents
  registerTool({
    name: "rushfiles_list_folder",
    description: "Bekijk de inhoud van een map in RushFiles. Geeft een lijst van bestanden en submappen terug.",
    input_schema: {
      type: "object",
      properties: {
        share_id: {
          type: "string",
          description: "Het share ID in RushFiles. Gebruik het standaard share ID als je niet weet welke share.",
        },
        folder_id: {
          type: "string",
          description: "Het virtual file ID van de map. Gebruik 'root' voor de hoofdmap van de share.",
        },
        path_hint: {
          type: "string",
          description: "Een leesbare beschrijving van welk pad je bekijkt (bijv. 'De Parmentier/Contracten'). Wordt gebruikt in het antwoord.",
        },
      },
      required: ["share_id", "folder_id"],
    },
    execute: async (input) => {
      try {
        const shareId = input.share_id as string || config.defaultShareId;
        const folderId = input.folder_id as string;
        const pathHint = (input.path_hint as string) || folderId;

        const url = `${config.filecacheUrl}/api/shares/${shareId}/folders/${folderId}`;
        const res = await rushfilesFetch(url);

        if (!res.ok) {
          const errText = await res.text();
          return `Fout bij ophalen mapinhoud: ${res.status} — ${errText}`;
        }

        const data = await res.json() as RfVirtualFile[];
        return formatFileList(data, pathHint);
      } catch (err) {
        return `RushFiles fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  // 2. Search files by name
  registerTool({
    name: "rushfiles_search",
    description: "Zoek naar bestanden in RushFiles op basis van bestandsnaam. Handig om contracten, facturen of andere documenten te vinden.",
    input_schema: {
      type: "object",
      properties: {
        share_id: {
          type: "string",
          description: "Het share ID om in te zoeken.",
        },
        query: {
          type: "string",
          description: "Zoekterm voor de bestandsnaam (bijv. 'Jan de Vries', 'contract', 'factuur maart')",
        },
        folder_id: {
          type: "string",
          description: "Optioneel: zoek alleen in deze map en submappen.",
        },
      },
      required: ["share_id", "query"],
    },
    execute: async (input) => {
      try {
        const shareId = input.share_id as string || config.defaultShareId;
        const query = (input.query as string).toLowerCase();
        const folderId = input.folder_id as string || "root";

        // RushFiles doesn't have a native search endpoint, so we do a recursive folder scan
        // For now, list the folder and filter — in production, this should use metadata/catchup API
        const url = `${config.filecacheUrl}/api/shares/${shareId}/folders/${folderId}`;
        const res = await rushfilesFetch(url);

        if (!res.ok) {
          return `Fout bij zoeken: ${res.status}`;
        }

        const files = await res.json() as RfVirtualFile[];
        const matches = files.filter((f) =>
          f.PublicName.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
          return `Geen bestanden gevonden voor "${input.query}" in deze map. Tip: probeer een andere map of een bredere zoekterm.`;
        }

        const lines = [`Gevonden (${matches.length} resultaten voor "${input.query}"):\n`];
        for (const f of matches) {
          const type = f.IsFolder ? "📁" : "📄";
          const size = !f.IsFolder && f.EndOfFile ? ` (${Math.round(f.EndOfFile / 1024)} KB)` : "";
          lines.push(`${type} ${f.PublicName}${size} — ID: ${f.InternalName}`);
        }

        return lines.join("\n");
      } catch (err) {
        return `RushFiles zoekfout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  // 3. Get file info / download link
  registerTool({
    name: "rushfiles_file_info",
    description: "Haal informatie op over een specifiek bestand in RushFiles, inclusief download-link.",
    input_schema: {
      type: "object",
      properties: {
        share_id: {
          type: "string",
          description: "Het share ID.",
        },
        file_id: {
          type: "string",
          description: "Het virtual file ID (InternalName) van het bestand.",
        },
      },
      required: ["share_id", "file_id"],
    },
    execute: async (input) => {
      try {
        const shareId = input.share_id as string || config.defaultShareId;
        const fileId = input.file_id as string;

        // Get read access to generate download URL
        const accessUrl = `${config.gatewayUrl}/api/shares/${shareId}/files/${fileId}/readaccess`;
        const res = await rushfilesFetch(accessUrl);

        if (!res.ok) {
          return `Bestand niet gevonden of geen toegang (${res.status}).`;
        }

        const data = await res.json() as { Message?: string; Data?: unknown };
        const downloadUrl = `${config.filecacheUrl}/api/shares/${shareId}/files/${fileId}`;

        return `Bestand gevonden.\nShare: ${shareId}\nFile ID: ${fileId}\nDownload URL: ${downloadUrl}\n\nOpmerking: de gebruiker kan dit bestand openen via RushFiles.`;
      } catch (err) {
        return `RushFiles fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  // 4. Get user's available shares
  registerTool({
    name: "rushfiles_list_shares",
    description: "Toon alle beschikbare shares (gedeelde mappen) in RushFiles waar de gebruiker toegang toe heeft.",
    input_schema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      try {
        const res = await rushfilesFetch(
          `${config.gatewayUrl}/api/client/fullprofile?associationRequired=true`
        );

        if (!res.ok) {
          return `Fout bij ophalen shares: ${res.status}`;
        }

        const data = await res.json() as {
          Domains?: {
            Shares?: { Id: string; Name: string; SpaceUsed?: number }[];
            DomainName?: string;
          }[];
        };

        const shares = data.Domains?.flatMap((d) =>
          (d.Shares ?? []).map((s) => ({
            ...s,
            domain: d.DomainName,
          }))
        ) ?? [];

        if (shares.length === 0) return "Geen shares gevonden.";

        const lines = [`Beschikbare RushFiles shares (${shares.length}):\n`];
        for (const s of shares) {
          const used = s.SpaceUsed ? `${Math.round(s.SpaceUsed / 1024 / 1024)} MB` : "";
          lines.push(`- ${s.Name} (ID: ${s.Id})${used ? ` — ${used} gebruikt` : ""}`);
        }
        lines.push(`\nGebruik het share ID om mappen te bekijken met rushfiles_list_folder.`);

        return lines.join("\n");
      } catch (err) {
        return `RushFiles fout: ${err instanceof Error ? err.message : "Onbekende fout"}`;
      }
    },
  });

  console.log("RushFiles tools registered (4 tools)");
}
