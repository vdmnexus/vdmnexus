"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

// inference_logs.id is a uuid v4. Playground short-ids are 10-char base58.
// Solana tx signatures are 80-100 char base58. Receipt URLs are
// vdmnexus.com/r/<id>. All four normalise to a single id string.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
const SHORT_ID_REGEX = /^[1-9A-HJ-NP-Za-km-z]{10}$/;

// A known-good mainnet receipt — the canonical "did the path work?" green
// run from CLAUDE.md. Kept here as a string so visitors who land cold can
// see a verified result without having to find an id elsewhere.
const SAMPLE_RECEIPT_ID = "0d3a5b26-d688-4d93-bfdc-7555b1324ac1";

type CheckKey =
  | "prompt_hash_ok"
  | "response_hash_ok"
  | "nexus_signature_ok"
  | "payment_on_chain_ok"
  | "payer_matches";

type VerifyResult =
  | {
      ok: boolean;
      checks: Partial<Record<CheckKey, boolean>>;
      mode: "full" | "sig-only";
    }
  | { error: string; detail?: string };

const CHECK_META: Record<
  CheckKey,
  { label: string; note: string; detail: string; failHint: string }
> = {
  prompt_hash_ok: {
    label: "Prompt hash matches",
    note: "sha256 of the prompt equals receipt.prompt_hash",
    detail:
      "The verifier hashes the original prompt bytes and compares to the digest stored in the receipt. If they differ, either the prompt was tampered with after the call or the operator hashed different bytes than they returned text for.",
    failHint:
      "The prompt the operator hashed doesn't match what was supplied to the verifier. Either the prompt has been edited, or the operator hashed different bytes than they returned text for.",
  },
  response_hash_ok: {
    label: "Response hash matches",
    note: "sha256 of the response equals receipt.response_hash",
    detail:
      "The verifier hashes the response text and compares to receipt.response_hash. A mismatch means the response text was edited after the receipt was signed.",
    failHint:
      "The response text supplied to the verifier doesn't hash to the digest in the receipt. Whoever produced this receipt didn't sign over the response you're showing.",
  },
  nexus_signature_ok: {
    label: "Operator signature valid",
    note: "Ed25519 signature verified against the published operator pubkey",
    detail:
      "The verifier canonicalizes the receipt (sorted keys, no whitespace, excluding nexus_signature) and checks the Ed25519 signature against the operator pubkey published at /api/v1/operator-key.",
    failHint:
      "The signature in the receipt doesn't verify against the operator's published public key. Either the receipt was edited after signing or it wasn't signed by Nexus.",
  },
  payment_on_chain_ok: {
    label: "Payment landed on-chain",
    note: "USDC transfer to the declared recipient confirmed on the chain",
    detail:
      "For paid (x402) receipts, the verifier fetches the transaction referenced in receipt.payment.tx_signature and confirms a USDC transfer of the declared amount landed at receipt.payment.pay_to. For prepaid receipts there is no on-chain payment to check and this is vacuously true.",
    failHint:
      "The transaction the receipt references either doesn't exist or didn't transfer USDC to the declared recipient. The payment claim is wrong.",
  },
  payer_matches: {
    label: "Payer matches agent",
    note: "First signer of the payment tx equals receipt.agent_pubkey",
    detail:
      "The agent_pubkey in the receipt must be the same key that signed the on-chain payment. This stops someone from re-using another agent's payment to claim a different identity.",
    failHint:
      "The on-chain payment was signed by a different key than the agent_pubkey in the receipt. Identity and payment don't agree.",
  },
};

const CHECK_ORDER: CheckKey[] = [
  "prompt_hash_ok",
  "response_hash_ok",
  "nexus_signature_ok",
  "payment_on_chain_ok",
  "payer_matches",
];

function extractId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Try parsing as a URL first — handles vdmnexus.com/r/<id> and bare paths.
  try {
    const u = new URL(trimmed);
    const m = u.pathname.match(/\/r\/([^\/?#]+)/);
    if (m && m[1]) return m[1];
  } catch {
    // Not a URL — fall through to direct-id parsing.
  }
  if (UUID_REGEX.test(trimmed)) return trimmed.toLowerCase();
  if (TX_SIGNATURE_REGEX.test(trimmed)) return trimmed;
  if (SHORT_ID_REGEX.test(trimmed)) return trimmed;
  return null;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerify = useCallback(async (raw: string) => {
    setResult(null);
    const id = extractId(raw);
    if (!id) {
      setResult({
        error: "invalid_input",
        detail:
          "Paste a receipt URL (vdmnexus.com/r/<id>) or a receipt id (UUID, 10-char short id, or Solana tx signature).",
      });
      return;
    }

    setLoading(true);
    try {
      // The id-lookup verify endpoint lives on vdmnexus.com — it can
      // resolve any of the three id formats against inference_logs or the
      // playground receipts table. Same five-check verification underneath.
      //
      // Hit the canonical `www.` host directly. The apex `vdmnexus.com`
      // 307-redirects to `www.vdmnexus.com`, and browsers refuse to follow
      // redirects on CORS preflights — the OPTIONS hard-fails and `fetch`
      // throws "Failed to fetch" regardless of the destination's CORS
      // headers. Calling `www.` skips the redirect entirely.
      const res = await fetch("https://www.vdmnexus.com/api/playground/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const detail = await res.text();
        setResult({ error: `http_${res.status}`, detail });
        return;
      }
      const json = (await res.json()) as VerifyResult & {
        checks?: Record<string, boolean>;
      };
      const checks = (json as { checks?: Record<string, boolean> }).checks ?? {};
      const checkKeys = Object.keys(checks) as CheckKey[];
      const mode: "full" | "sig-only" =
        checkKeys.length >= 4 ? "full" : "sig-only";
      setResult({
        ok: Boolean((json as { ok?: boolean }).ok),
        checks,
        mode,
      });
    } catch (err) {
      setResult({
        error: "network_error",
        detail: err instanceof Error ? err.message : "unknown",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Deep-link support: `?r=<id>` (or `?receipt=<id>`) pre-fills the input
  // and auto-runs. Lets receipts on vdmnexus.com link directly to a
  // pre-verified card, and lets visitors share a verifiable result without
  // copy/paste.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("r") ?? params.get("receipt");
    if (!fromUrl) return;
    setInput(fromUrl);
    void runVerify(fromUrl);
  }, [runVerify]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runVerify(input);
  }

  function loadSample() {
    setInput(SAMPLE_RECEIPT_ID);
    void runVerify(SAMPLE_RECEIPT_ID);
  }

  return (
    <main className="container">
      <span className="eyebrow">verify.vdmnexus.com</span>
      <h1>Verify a Nexus receipt</h1>
      <p className="lead">
        Drop in a receipt URL or id. We run the same five-check
        verification as <code>@vdm-nexus/x402</code> — hashes, operator
        signature, on-chain settlement, payer match — and return the
        verdict. Code path is open source.
      </p>

      <form onSubmit={onSubmit} className="card">
        <label htmlFor="receipt">Receipt URL or id</label>
        <div className="row">
          <input
            id="receipt"
            type="text"
            placeholder="https://vdmnexus.com/r/c9710ea7-... or just the id"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
        <div className="form-foot">
          <span className="muted">
            Accepts <code>/r/&lt;id&gt;</code> URLs, UUIDs, 10-char short ids,
            and Solana tx signatures.
          </span>
          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="link-button"
            aria-label="Verify a known-good sample receipt"
          >
            Try a sample receipt →
          </button>
        </div>
      </form>

      {result && <ResultPanel result={result} />}

      <div className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">Programmatic</span>
        <p className="muted" style={{ marginTop: 8 }}>
          For machine-to-machine verification, POST a full receipt + prompt +
          response to the local API. CORS is open.
        </p>
        <pre className="api-block">{`curl -X POST https://verify.vdmnexus.com/api/verify \\
  -H "content-type: application/json" \\
  -d '{ "receipt": { ... }, "prompt": [...], "response": { ... } }'`}</pre>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Or import the same code path directly:{" "}
          <code>
            import &#123; verifyReceipt &#125; from &quot;@vdm-nexus/x402&quot;
          </code>
          .
        </p>
      </div>

      <div className="footer">
        <span>
          Open source ·{" "}
          <a href="https://github.com/vdmnexus/vdmnexus" rel="noreferrer">
            github.com/vdmnexus/vdmnexus
          </a>
        </span>
        <span>
          <a
            href="https://docs.vdmnexus.com/docs/spec/sir-v2"
            rel="noreferrer"
          >
            SIR v2 spec
          </a>
          {" · "}
          <a href="https://vdmnexus.com" rel="noreferrer">
            vdmnexus.com
          </a>
        </span>
      </div>
    </main>
  );
}

function ResultPanel({ result }: { result: VerifyResult }) {
  if ("error" in result) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <span className="verdict" data-state="err">
          Could not verify
        </span>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          {result.detail ?? result.error}
        </p>
      </div>
    );
  }

  const checks = result.checks;
  const checkEntries = CHECK_ORDER.filter((key) => checks[key] !== undefined);

  const verdictState = result.ok ? "ok" : "err";
  const verdictLabel = result.ok
    ? result.mode === "sig-only"
      ? "Signature verified"
      : "Verified"
    : "Failed";

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="result-head">
        <div>
          <span className="eyebrow">Verification result</span>
          <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
            Click any check for an explanation of how it works.
          </p>
        </div>
        <span className="verdict" data-state={verdictState}>
          {verdictLabel}
        </span>
      </div>

      <div className="check-list">
        {checkEntries.map((key, i) => (
          <CheckRow
            key={key}
            num={i + 1}
            checkKey={key}
            passed={Boolean(checks[key])}
          />
        ))}
      </div>

      {result.mode === "sig-only" && (
        <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
          Sig-only verification — the operator signature is valid, but the
          full five-check verification needs the prompt + response payload.
          POST them to <code>/api/verify</code> for the complete result.
        </p>
      )}
    </div>
  );
}

function CheckRow({
  num,
  checkKey,
  passed,
}: {
  num: number;
  checkKey: CheckKey;
  passed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = CHECK_META[checkKey];
  const explanation = passed ? meta.detail : meta.failHint;

  return (
    <div className="check-row" data-state={passed ? "ok" : "err"}>
      <button
        type="button"
        className="check-row-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="check-num">{num}</span>
        <span
          className="check-dot"
          data-state={passed ? "ok" : "err"}
          aria-hidden
        />
        <span className="check-label-wrap">
          <span className="check-label">{meta.label}</span>
          <span className="check-note">{meta.note}</span>
        </span>
        <span className="check-state" data-state={passed ? "ok" : "err"}>
          {passed ? "PASS" : "FAIL"}
        </span>
        <span className={`chev ${open ? "open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="check-detail">
          <p>{explanation}</p>
        </div>
      )}
    </div>
  );
}
