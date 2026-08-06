import type { Abi, AbiEvent } from "viem";

/**
 * PROVISIONAL Rienda ABI fragments.
 *
 * The vault contracts live in a private repo. These fragments were written
 * from the public protocol description on /rienda, not from the compiled
 * artifacts, so **none of these signatures are confirmed**. Reconciling them
 * against the deployed contracts is a required follow-up before anything on
 * /live should be trusted as a complete picture.
 *
 * Two consequences the consuming code is built around:
 *
 * 1. A wrong function name makes `readContract` revert. Every read is
 *    wrapped, every field carries its own availability, and a field that
 *    can't be read renders "unavailable" — never a zero, never a guess.
 * 2. A wrong event signature produces a different topic0, so a filtered
 *    `getLogs` silently returns nothing. To avoid mistaking "wrong ABI" for
 *    "no activity", the live route pulls logs *unfiltered* by address and
 *    tries to decode each one with the candidates below. Undecoded logs are
 *    still shown — they are real on-chain events — labelled by their topic0
 *    so the mismatch is visible rather than hidden.
 *
 * Because names are uncertain, each logical value lists several candidate
 * getters. The first one that returns wins, and the winning name is reported
 * back in the payload so reconciliation is a diff, not an investigation.
 */

/** Minimal zero-arg view fragment. One function, one output, no inputs. */
export function viewFragment(
  name: string,
  outputType: "uint256" | "uint8" | "bool" | "address" | "string"
): Abi {
  return [
    {
      type: "function",
      name,
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: outputType, name: "" }],
    },
  ] as const satisfies Abi;
}

/** Single-arg view fragment (index or address in, one value out). */
export function viewFragment1(
  name: string,
  inputType: "uint256" | "address",
  outputType: "uint256" | "address" | "address[]"
): Abi {
  return [
    {
      type: "function",
      name,
      stateMutability: "view",
      inputs: [{ type: inputType, name: "" }],
      outputs: [{ type: outputType, name: "" }],
    },
  ] as const satisfies Abi;
}

// ---------------------------------------------------------------------------
// VaultFactory
// ---------------------------------------------------------------------------

/**
 * Candidate `VaultCreated` shapes. The spec says "indexed owner, indexed
 * vault, plus preset info" — the preset's on-the-wire type is the unknown, so
 * the plausible encodings are enumerated. Argument order is also unconfirmed,
 * hence the owner-first and vault-first variants.
 */
export const VAULT_CREATED_CANDIDATES: readonly AbiEvent[] = [
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "preset", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "preset", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "preset", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "preset", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "vault", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "preset", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
    ],
  },
] as const;

/** `vaultsOf(owner)` — confirmed in the spec, name and shape still provisional. */
export const VAULTS_OF_CANDIDATES = ["vaultsOf", "getVaults", "vaultsOwnedBy"];

/** Count getter candidates. Used as a cross-check on the log-derived list. */
export const VAULT_COUNT_CANDIDATES = [
  "vaultCount",
  "totalVaults",
  "allVaultsLength",
  "vaultsLength",
  "numVaults",
];

/** Index → vault address, for walking the count getter when logs don't decode. */
export const VAULT_AT_CANDIDATES = ["vaultAt", "allVaults", "vaults", "vaultByIndex"];

// ---------------------------------------------------------------------------
// AgentVault — read-only views
// ---------------------------------------------------------------------------

export type VaultFieldKind = "uint" | "bool" | "address";

/** How a numeric field should be rendered once it's read. */
export type VaultFieldUnit = "bps" | "token" | "count";

export type VaultReadSpec = {
  /** Stable key in the JSON payload and the React keys on the page. */
  key: string;
  label: string;
  kind: VaultFieldKind;
  unit?: VaultFieldUnit;
  /** Zero-arg getter names to try, in order. First success wins. */
  candidates: readonly string[];
  /** Shown under the value on the page. Describes the guardrail, not a claim. */
  hint?: string;
};

/** Vault state: what the vault is worth and whether it is trading. */
export const VAULT_STATE_READS: readonly VaultReadSpec[] = [
  {
    key: "settlementToken",
    label: "Settlement token",
    kind: "address",
    candidates: ["settlementToken", "asset", "denominationAsset", "baseToken"],
  },
  {
    key: "nav",
    label: "NAV",
    kind: "uint",
    unit: "token",
    candidates: ["nav", "totalValue", "totalAssets", "netAssetValue"],
    hint: "Total value the vault holds, in settlement-token units.",
  },
  {
    key: "grossExposure",
    label: "Gross exposure",
    kind: "uint",
    unit: "token",
    candidates: ["grossExposure", "currentGrossExposure", "totalExposure"],
    hint: "Sum of open positions, in settlement-token units.",
  },
  {
    key: "highWaterMark",
    label: "High-water mark",
    kind: "uint",
    unit: "token",
    candidates: ["highWaterMark", "hwm", "highWaterMarkValue"],
    hint: "Peak NAV. Drawdown tiers measure against this.",
  },
  {
    key: "paused",
    label: "Paused",
    kind: "bool",
    candidates: ["paused", "isPaused", "halted"],
    hint: "Owner or guardian kill switch (guardrail 10).",
  },
  {
    key: "hibernating",
    label: "Hibernating",
    kind: "bool",
    candidates: ["hibernating", "isHibernating", "riskReducingOnly"],
    hint: "Risk-reducing intents only. Compute budget exhausted or drawdown tier hit.",
  },
];

/**
 * Guardrail parameters. Each pairs a configured cap with the current reading
 * it bounds, so the page can show headroom instead of a naked limit. Either
 * half can be unavailable independently — a cap with no current reading
 * renders the cap and says the current value could not be read.
 */
export type GuardrailSpec = {
  key: string;
  /** Guardrail number as it appears on /rienda. */
  n: string;
  label: string;
  cap: VaultReadSpec;
  current?: VaultReadSpec;
};

export const GUARDRAIL_READS: readonly GuardrailSpec[] = [
  {
    key: "positionCap",
    n: "01",
    label: "Max position size per asset",
    cap: {
      key: "positionCapBps",
      label: "Cap",
      kind: "uint",
      unit: "bps",
      candidates: ["positionCapBps", "maxPositionBps", "positionLimitBps"],
    },
    current: {
      key: "largestPositionBps",
      label: "Largest position",
      kind: "uint",
      unit: "bps",
      candidates: ["largestPositionBps", "maxOpenPositionBps", "biggestPositionBps"],
    },
  },
  {
    key: "grossExposureCap",
    n: "02",
    label: "Max gross exposure",
    cap: {
      key: "grossExposureCapBps",
      label: "Cap",
      kind: "uint",
      unit: "bps",
      candidates: ["grossExposureCapBps", "maxGrossExposureBps", "grossCapBps"],
    },
    current: {
      key: "grossExposureBps",
      label: "Current",
      kind: "uint",
      unit: "bps",
      candidates: ["grossExposureBps", "currentGrossExposureBps"],
    },
  },
  {
    key: "dailyLoss",
    n: "03",
    label: "Daily realized loss limit",
    cap: {
      key: "dailyLossLimitBps",
      label: "Limit",
      kind: "uint",
      unit: "bps",
      candidates: ["dailyLossLimitBps", "maxDailyLossBps", "dailyLossCapBps"],
    },
    current: {
      key: "dailyRealizedLossBps",
      label: "Today",
      kind: "uint",
      unit: "bps",
      candidates: ["dailyRealizedLossBps", "todayRealizedLossBps", "realizedLossTodayBps"],
    },
  },
  {
    key: "drawdownTier",
    n: "04",
    label: "Drawdown throttles",
    cap: {
      key: "drawdownTierBps",
      label: "First tier",
      kind: "uint",
      unit: "bps",
      candidates: ["drawdownTierBps", "drawdownTier1Bps", "drawdownThrottleBps"],
    },
    current: {
      key: "currentDrawdownBps",
      label: "Current drawdown",
      kind: "uint",
      unit: "bps",
      candidates: ["currentDrawdownBps", "drawdownBps"],
    },
  },
  {
    key: "orderRate",
    n: "06",
    label: "Order rate limit",
    cap: {
      key: "maxOrdersPerHour",
      label: "Cap",
      kind: "uint",
      unit: "count",
      candidates: ["maxOrdersPerHour", "ordersPerHourCap", "orderRateLimit"],
    },
    current: {
      key: "ordersThisHour",
      label: "This hour",
      kind: "uint",
      unit: "count",
      candidates: ["ordersThisHour", "ordersInWindow", "currentHourOrders"],
    },
  },
  {
    key: "oracleBand",
    n: "07",
    label: "Oracle price sanity band",
    cap: {
      key: "oracleBandBps",
      label: "Band",
      kind: "uint",
      unit: "bps",
      candidates: ["oracleBandBps", "priceBandBps", "oracleToleranceBps"],
    },
  },
];

/** ERC-20 metadata, for labelling NAV. Standard, so these are not provisional. */
export const ERC20_SYMBOL_ABI = viewFragment("symbol", "string");
export const ERC20_DECIMALS_ABI = viewFragment("decimals", "uint8");

// ---------------------------------------------------------------------------
// Trade / decision events
// ---------------------------------------------------------------------------

/**
 * Candidate execution-path events. Same caveat as `VAULT_CREATED_CANDIDATES`:
 * a miss means the log stays undecoded, not that it disappears.
 */
export const TRADE_EVENT_CANDIDATES: readonly AbiEvent[] = [
  {
    type: "event",
    name: "TradeExecuted",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TradeExecuted",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "isBuy", type: "bool", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "IntentExecuted",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "IntentRejected",
    inputs: [
      { name: "asset", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DecisionRecorded",
    inputs: [
      { name: "receiptId", type: "bytes32", indexed: true },
      { name: "asset", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Paused",
    inputs: [{ name: "account", type: "address", indexed: false }],
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [{ name: "account", type: "address", indexed: false }],
  },
] as const;
