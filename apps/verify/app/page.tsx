"use client";

import { type FormEvent, useState } from "react";

// inference_logs.id is a uuid v4. Playground short-ids are 10-char base58.
// Solana tx signatures are 80-100 char base58. Receipt URLs are
// vdmnexus.com/r/<id>. All four normalise to a single id string.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TX_SIGNATURE_REGEX = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;
const SHORT_ID_REGEX = /^[1-9A-HJ-NP-Za-km-z]{10}$/;

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

const CHECK_LABELS: Record<CheckKey, string> = {
  prompt_hash_ok: "Prompt hash",
  response_hash_ok: "Response hash",
  nexus_signature_ok: "Operator signature",
  payment_on_chain_ok: "On-chain settlement",
  payer_matches: "Payer + recipient match",
};

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    const id = extractId(input);
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
      const res = await fetch(
        "https://vdmnexus.com/api/playground/verify",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
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
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Accepts <code>/r/&lt;id&gt;</code> URLs, UUIDs, 10-char short ids,
          and Solana tx signatures.
        </p>
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
          <a href="https://docs.vdmnexus.com/spec/sir-v2" rel="noreferrer">
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
  const checkEntries = (Object.keys(CHECK_LABELS) as CheckKey[])
    .map((key) => ({ key, value: checks[key] }))
    .filter((c) => c.value !== undefined);

  const verdictState = result.ok ? "ok" : "err";
  const verdictLabel = result.ok
    ? result.mode === "sig-only"
      ? "Signature verified"
      : "Verified"
    : "Failed";

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span className="eyebrow">Verification result</span>
        <span className="verdict" data-state={verdictState}>
          {verdictLabel}
        </span>
      </div>

      <div>
        {checkEntries.map(({ key, value }) => (
          <div key={key} className="check">
            <span
              className="check-dot"
              data-state={value ? "ok" : "err"}
              aria-hidden
            />
            <span className="check-label">{CHECK_LABELS[key]}</span>
            <span
              className="check-state"
              data-state={value ? "ok" : "err"}
            >
              {value ? "PASS" : "FAIL"}
            </span>
          </div>
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
