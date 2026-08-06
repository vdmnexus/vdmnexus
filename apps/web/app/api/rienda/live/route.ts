/**
 * GET /api/rienda/live
 *
 * Everything /live renders, read from Robinhood Chain and shaped into JSON.
 * The reads happen here rather than in the browser for three reasons: the
 * public RPC has no CORS guarantee, one server-side cache serves every
 * visitor instead of every visitor hammering the RPC, and the provisional
 * ABI (see lib/rienda-abi.ts) needs try/catch around every single call —
 * doing that once, server-side, keeps the page component simple.
 *
 * The route never throws. A dead RPC, a wrong contract address, or an ABI
 * that doesn't match the deployment all come back as 200 + a payload whose
 * fields say "unavailable" and whose `errors` array says why. A page that
 * shows nothing is correct; a page that shows a plausible-looking zero is
 * not.
 *
 * Cost: one poll does 1 block-number call, 2 `getLogs` calls, and up to
 * ~18 `readContract` calls per vault panel (capped at MAX_VAULT_PANELS).
 * Getter-name resolution is memoised for RESOLVE_TTL_MS so steady-state
 * polls make one call per field, not one per candidate. Responses are
 * cached for CACHE_TTL_MS, so N concurrent visitors cost one round of RPC
 * per interval, not N.
 */

import { NextResponse } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  http,
  type Abi,
  type AbiEvent,
  type Address,
  type Log,
  type PublicClient,
} from "viem";
import {
  ERC20_DECIMALS_ABI,
  ERC20_SYMBOL_ABI,
  GUARDRAIL_READS,
  TRADE_EVENT_CANDIDATES,
  VAULT_COUNT_CANDIDATES,
  VAULT_CREATED_CANDIDATES,
  VAULT_STATE_READS,
  viewFragment,
  type GuardrailSpec,
  type VaultReadSpec,
} from "@/lib/rienda-abi";
import { isDeployed, riendaChain, riendaConfig } from "@/lib/rienda-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How long a payload is reused before the chain is read again. */
const CACHE_TTL_MS = 10_000;
/** How long a resolved (or unresolvable) getter name is trusted. */
const RESOLVE_TTL_MS = 5 * 60_000;
/** Panels are ~18 reads each — bound the work regardless of vault count. */
const MAX_VAULT_PANELS = 6;
/** Newest-first activity rows returned to the client. */
const MAX_ACTIVITY = 25;
/** Block window used when no deploy block is configured. */
const FACTORY_LOOKBACK = BigInt(100_000);
const ACTIVITY_LOOKBACK = BigInt(50_000);

// ---------------------------------------------------------------------------
// Payload types (mirrored in components/rienda/live-view.tsx)
// ---------------------------------------------------------------------------

export type FieldValue =
  | { ok: true; value: string; via: string }
  | { ok: false; reason: string };

export type GuardrailValue = {
  key: string;
  n: string;
  label: string;
  capLabel: string;
  cap: FieldValue;
  capUnit: string;
  currentLabel: string | null;
  current: FieldValue | null;
  currentUnit: string | null;
};

export type VaultPanel = {
  address: string;
  owner: string | null;
  preset: string | null;
  createdTx: string | null;
  createdBlock: string | null;
  /** "factory" — enumerated from factory storage (totalVaults/vaultAt).
   *  "log" — decoded from a factory event. "pinned" — from env. */
  source: "factory" | "log" | "pinned";
  state: Array<{ key: string; label: string; hint?: string; value: FieldValue }>;
  guardrails: GuardrailValue[];
};

export type ActivityEntry = {
  txHash: string;
  blockNumber: string;
  logIndex: number;
  vault: string;
  /** Decoded event name, or null when no provisional fragment matched. */
  name: string | null;
  /** Human-readable decoded args. Null when undecoded. */
  summary: string | null;
  /** Raw topic0 — the handle for reconciling an undecoded event. */
  topic0: string | null;
};

export type LivePayload = {
  configured: boolean;
  chainId: number;
  fetchedAt: string;
  blockNumber: string | null;
  factory: string | null;
  mockOracle: string | null;
  settlementToken: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  vaultCount: FieldValue | null;
  vaults: VaultPanel[];
  activity: ActivityEntry[];
  /** Non-fatal observations worth showing on the page. */
  notes: string[];
  /** Things that failed. Rendered, not swallowed. */
  errors: string[];
};

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

let cached: { at: number; payload: LivePayload } | null = null;

/** `${address}:${specKey}` → winning getter name, or null for "none matched". */
const resolvedGetters = new Map<string, string | null>();
let resolvedAt = 0;

function resolutionsFresh(): boolean {
  if (Date.now() - resolvedAt > RESOLVE_TTL_MS) {
    resolvedGetters.clear();
    resolvedAt = Date.now();
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function GET() {
  const config = riendaConfig();
  const chain = riendaChain(config);

  if (!isDeployed(config)) {
    // Not an error — this is the expected state until the testnet deploy.
    return json({
      configured: false,
      chainId: chain.id,
      fetchedAt: new Date().toISOString(),
      blockNumber: null,
      factory: null,
      mockOracle: config.mockOracle ?? null,
      settlementToken: config.settlementToken ?? null,
      tokenSymbol: null,
      tokenDecimals: null,
      vaultCount: null,
      vaults: [],
      activity: [],
      notes: [],
      errors: [],
    });
  }

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.payload);
  }

  let payload: LivePayload;
  try {
    payload = await readChain(config, chain);
  } catch (err) {
    // Belt and braces: readChain already catches per-call, so reaching here
    // means something structural (bad RPC URL, transport construction).
    payload = {
      configured: true,
      chainId: chain.id,
      fetchedAt: new Date().toISOString(),
      blockNumber: null,
      factory: config.factory ?? null,
      mockOracle: config.mockOracle ?? null,
      settlementToken: config.settlementToken ?? null,
      tokenSymbol: null,
      tokenDecimals: null,
      vaultCount: null,
      vaults: [],
      activity: [],
      notes: [],
      errors: [`Could not reach ${chain.name}: ${message(err)}`],
    };
  }

  cached = { at: Date.now(), payload };
  return json(payload);
}

function json(payload: LivePayload) {
  return NextResponse.json(payload, {
    headers: { "cache-control": "no-store" },
  });
}

// ---------------------------------------------------------------------------
// Chain reads
// ---------------------------------------------------------------------------

async function readChain(
  config: ReturnType<typeof riendaConfig>,
  chain: ReturnType<typeof riendaChain>
): Promise<LivePayload> {
  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  }) as PublicClient;

  const factory = config.factory as Address;
  const notes: string[] = [];
  const errors: string[] = [];

  resolutionsFresh();

  const head = await safe(() => client.getBlockNumber());
  if (head === undefined) {
    errors.push(
      `No block number from ${chain.name}. The RPC endpoint did not respond.`
    );
  }

  // --- vault list -----------------------------------------------------------
  const factoryFrom = fromBlock(config.deployBlock, head, FACTORY_LOOKBACK);
  if (config.deployBlock === undefined && head !== undefined) {
    notes.push(
      `No deploy block configured — the vault list scans the last ${FACTORY_LOOKBACK} blocks only.`
    );
  }

  const factoryLogs =
    head === undefined
      ? []
      : ((await safe(() =>
          client.getLogs({ address: factory, fromBlock: factoryFrom, toBlock: head })
        )) ?? []);

  const fromLogs = decodeVaultCreated(factoryLogs);
  if (factoryLogs.length > 0 && fromLogs.length === 0) {
    notes.push(
      `The factory emitted ${factoryLogs.length} event${
        factoryLogs.length === 1 ? "" : "s"
      } in the scanned range, but none matched the provisional VaultCreated fragments. The ABI needs reconciling against the deployed contract.`
    );
  }

  const seen = new Set(fromLogs.map((v) => v.address.toLowerCase()));
  const pinned = config.pinnedVaults
    .filter((a) => !seen.has(a.toLowerCase()))
    .map(
      (address): VaultRef => ({
        address,
        owner: null,
        preset: null,
        createdTx: null,
        createdBlock: null,
        source: "pinned",
      })
    );
  let refs: VaultRef[] = [...fromLogs, ...pinned];

  // Skip the probe entirely when the RPC is down — five doomed calls would
  // report "no getter matched", which blames the ABI for a transport failure.
  const vaultCount =
    head === undefined
      ? null
      : await readFirst(client, factory, {
          key: "vaultCount",
          label: "Vaults created",
          kind: "uint",
          candidates: VAULT_COUNT_CANDIDATES,
        });

  // Prefer factory-storage enumeration (totalVaults → vaultAt): complete and
  // trustless, unlike the log window (gaps) or env pins (told, not discovered).
  // Log/pin metadata still enriches enumerated entries; anything the factory
  // doesn't report (e.g. beyond the enumeration cap) stays listed as before.
  if (vaultCount?.ok) {
    const reported = Number(vaultCount.value);
    const enumerated =
      reported > 0 ? await enumerateVaults(client, factory, reported) : [];
    if (enumerated !== null) {
      const byAddress = new Map(refs.map((r) => [r.address.toLowerCase(), r]));
      const fromFactory = enumerated.map((address): VaultRef => {
        const meta = byAddress.get(address.toLowerCase());
        return {
          address,
          owner: meta?.owner ?? null,
          preset: meta?.preset ?? null,
          createdTx: meta?.createdTx ?? null,
          createdBlock: meta?.createdBlock ?? null,
          source: "factory",
        };
      });
      const inFactory = new Set(enumerated.map((a) => a.toLowerCase()));
      refs = [...fromFactory, ...refs.filter((r) => !inFactory.has(r.address.toLowerCase()))];
      if (reported > MAX_ENUMERATED_VAULTS) {
        notes.push(
          `The factory reports ${reported} vaults; the first ${MAX_ENUMERATED_VAULTS} were enumerated from storage.`
        );
      }
    }
  }

  // --- settlement-token metadata -------------------------------------------
  let tokenSymbol: string | null = null;
  let tokenDecimals: number | null = null;
  if (config.settlementToken) {
    tokenSymbol =
      (await safe(() =>
        client.readContract({
          address: config.settlementToken as Address,
          abi: ERC20_SYMBOL_ABI,
          functionName: "symbol",
        })
      )) as string | undefined ?? null;
    const dec = await safe(() =>
      client.readContract({
        address: config.settlementToken as Address,
        abi: ERC20_DECIMALS_ABI,
        functionName: "decimals",
      })
    );
    tokenDecimals = typeof dec === "number" ? dec : dec === undefined ? null : Number(dec);
  }

  // --- per-vault panels -----------------------------------------------------
  // Skipped when the RPC is down: every read would fail and the resolver
  // would cache "no such getter" for RESOLVE_TTL_MS, so a transport outage
  // would keep the panels blank long after the RPC recovered.
  const panelRefs = head === undefined ? [] : refs.slice(0, MAX_VAULT_PANELS);
  if (refs.length > panelRefs.length && head !== undefined) {
    notes.push(
      `Showing the first ${MAX_VAULT_PANELS} of ${refs.length} vaults. The rest are listed without a panel.`
    );
  }
  const vaults = await Promise.all(
    panelRefs.map((ref) => readVaultPanel(client, ref))
  );

  // --- activity feed --------------------------------------------------------
  let activity: ActivityEntry[] = [];
  const vaultAddresses = refs.map((r) => r.address);
  if (head !== undefined && vaultAddresses.length > 0) {
    const activityFrom = fromBlock(config.deployBlock, head, ACTIVITY_LOOKBACK);
    const logs =
      (await safe(() =>
        client.getLogs({
          address: vaultAddresses,
          fromBlock: activityFrom,
          toBlock: head,
        })
      )) ?? [];
    activity = logs
      .map(toActivityEntry)
      .sort(
        (a, b) =>
          Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)) ||
          b.logIndex - a.logIndex
      )
      .slice(0, MAX_ACTIVITY);

    const undecoded = activity.filter((a) => a.name === null).length;
    if (undecoded > 0) {
      notes.push(
        `${undecoded} of the ${activity.length} events shown could not be decoded with the provisional fragments. They are real on-chain events — only their names and arguments are missing.`
      );
    }
  }

  return {
    configured: true,
    chainId: chain.id,
    fetchedAt: new Date().toISOString(),
    blockNumber: head?.toString() ?? null,
    factory,
    mockOracle: config.mockOracle ?? null,
    settlementToken: config.settlementToken ?? null,
    tokenSymbol,
    tokenDecimals,
    vaultCount,
    vaults,
    activity,
    notes,
    errors,
  };
}

type VaultRef = {
  address: Address;
  owner: string | null;
  preset: string | null;
  createdTx: string | null;
  createdBlock: string | null;
  source: "factory" | "log" | "pinned";
};

/** Exact fragment — `vaultAt` is verified against the deployed factory source. */
const VAULT_AT_ABI = [
  {
    type: "function",
    name: "vaultAt",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

/** Storage enumeration is one read per vault — bound it independently of panels. */
const MAX_ENUMERATED_VAULTS = 50;

/**
 * Enumerate vault addresses from factory storage: totalVaults() → vaultAt(i).
 * Trustless (no env pinning) and complete (no log-window gaps). Returns null
 * when the factory doesn't answer, so callers can fall back to logs + pins.
 */
async function enumerateVaults(
  client: PublicClient,
  factory: Address,
  count: number
): Promise<Address[] | null> {
  const n = Math.min(count, MAX_ENUMERATED_VAULTS);
  const reads = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      safe(() =>
        client.readContract({
          address: factory,
          abi: VAULT_AT_ABI,
          functionName: "vaultAt",
          args: [BigInt(i)],
        })
      )
    )
  );
  const found = reads.filter((v): v is Address => typeof v === "string");
  return found.length > 0 ? found : null;
}

type Decoded = { eventName: string; args: Record<string, unknown> };

/**
 * Decode one log against one candidate fragment. Returns null on any
 * mismatch — a wrong topic0, a wrong data layout, or an unnamed-parameter
 * fragment (viem hands those back as a positional array, which tells us
 * nothing about which value is the vault).
 */
function tryDecode(candidate: AbiEvent, log: Log): Decoded | null {
  try {
    const decoded = decodeEventLog({
      abi: [candidate] as unknown as Abi,
      data: log.data,
      topics: log.topics,
    }) as unknown as { eventName?: unknown; args?: unknown };
    const args = decoded.args;
    if (!args || typeof args !== "object" || Array.isArray(args)) return null;
    return {
      eventName:
        typeof decoded.eventName === "string" ? decoded.eventName : candidate.name,
      args: args as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/** Try every provisional VaultCreated shape against every factory log. */
function decodeVaultCreated(logs: Log[]): VaultRef[] {
  const out: VaultRef[] = [];
  const seen = new Set<string>();

  for (const log of logs) {
    for (const candidate of VAULT_CREATED_CANDIDATES) {
      const decoded = tryDecode(candidate, log);
      if (!decoded) continue;
      const args = decoded.args;
      const vault = args.vault;
      if (typeof vault !== "string") continue;
      const key = vault.toLowerCase();
      if (seen.has(key)) break;
      seen.add(key);
      out.push({
        address: vault as Address,
        owner: typeof args.owner === "string" ? args.owner : null,
        preset: args.preset === undefined ? null : stringify(args.preset),
        createdTx: log.transactionHash ?? null,
        createdBlock: log.blockNumber?.toString() ?? null,
        source: "log",
      });
      break;
    }
  }
  return out;
}

function toActivityEntry(log: Log): ActivityEntry {
  let name: string | null = null;
  let summary: string | null = null;

  for (const candidate of TRADE_EVENT_CANDIDATES) {
    const decoded = tryDecode(candidate, log);
    // Not this fragment — try the next. Falling off the end leaves the log
    // undecoded, which the page renders as "unnamed event" plus its topic0.
    if (!decoded) continue;
    name = decoded.eventName;
    summary =
      Object.entries(decoded.args)
        .map(([k, v]) => `${k}=${stringify(v)}`)
        .join(" · ") || null;
    break;
  }

  return {
    txHash: log.transactionHash ?? "",
    blockNumber: log.blockNumber?.toString() ?? "0",
    logIndex: log.logIndex ?? 0,
    vault: log.address,
    name,
    summary,
    topic0: log.topics[0] ?? null,
  };
}

async function readVaultPanel(
  client: PublicClient,
  ref: VaultRef
): Promise<VaultPanel> {
  const state = await Promise.all(
    VAULT_STATE_READS.map(async (spec) => ({
      key: spec.key,
      label: spec.label,
      ...(spec.hint ? { hint: spec.hint } : {}),
      value: await readFirst(client, ref.address, spec),
    }))
  );

  const guardrails = await Promise.all(
    GUARDRAIL_READS.map(async (g: GuardrailSpec): Promise<GuardrailValue> => {
      const [cap, current] = await Promise.all([
        readFirst(client, ref.address, g.cap),
        g.current ? readFirst(client, ref.address, g.current) : Promise.resolve(null),
      ]);
      return {
        key: g.key,
        n: g.n,
        label: g.label,
        capLabel: g.cap.label,
        cap,
        capUnit: g.cap.unit ?? "count",
        currentLabel: g.current?.label ?? null,
        current,
        currentUnit: g.current?.unit ?? null,
      };
    })
  );

  return {
    address: ref.address,
    owner: ref.owner,
    preset: ref.preset,
    createdTx: ref.createdTx,
    createdBlock: ref.createdBlock,
    source: ref.source,
    state,
    guardrails,
  };
}

/**
 * Try each candidate getter until one returns. The winner is memoised per
 * (vault, field) so a steady-state poll costs one call per field instead of
 * one per candidate — and so does a permanent miss.
 */
async function readFirst(
  client: PublicClient,
  address: Address,
  spec: VaultReadSpec | {
    key: string;
    label: string;
    kind: "uint";
    candidates: readonly string[];
  }
): Promise<FieldValue> {
  const cacheKey = `${address.toLowerCase()}:${spec.key}`;
  const known = resolvedGetters.get(cacheKey);

  if (known === null) {
    return {
      ok: false,
      reason: `no getter matched (tried ${spec.candidates.join(", ")})`,
    };
  }

  const names = known ? [known] : spec.candidates;
  const outputType =
    spec.kind === "bool" ? "bool" : spec.kind === "address" ? "address" : "uint256";

  for (const name of names) {
    try {
      const value = await client.readContract({
        address,
        abi: viewFragment(name, outputType),
        functionName: name,
      });
      resolvedGetters.set(cacheKey, name);
      return { ok: true, value: stringify(value), via: name };
    } catch {
      // Wrong name, reverting getter, or an RPC hiccup. Next candidate.
    }
  }

  // Only cache the miss when we probed the full list — a single retry of a
  // previously-good name that hiccupped shouldn't poison the entry.
  if (!known) resolvedGetters.set(cacheKey, null);
  return {
    ok: false,
    reason: `no getter matched (tried ${spec.candidates.join(", ")})`,
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fromBlock(
  deployBlock: bigint | undefined,
  head: bigint | undefined,
  lookback: bigint
): bigint {
  if (deployBlock !== undefined) return deployBlock;
  const zero = BigInt(0);
  if (head === undefined) return zero;
  return head > lookback ? head - lookback : zero;
}

async function safe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

function stringify(value: unknown): string {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(stringify).join(", ");
  return String(value);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message.split("\n")[0] : String(err);
}
