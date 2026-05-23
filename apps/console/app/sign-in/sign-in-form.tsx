"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import bs58 from "bs58";
import nacl from "tweetnacl";

type Challenge = {
  nonce: string;
  expiresAt: number;
};

export function SignInForm() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Fetch the challenge on mount. The cookie write happens server-side
  // inside this route handler (which is allowed in Next.js 15) — the
  // page component itself cannot touch cookies during render.
  useEffect(() => {
    let cancelled = false;
    async function fetchChallenge() {
      try {
        const res = await fetch("/api/sign-in/challenge", {
          method: "GET",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setChallengeError(
            typeof body?.error === "string"
              ? body.error === "not_configured"
                ? "Sign-in is being configured. Please check back shortly."
                : body.error
              : `Couldn't fetch challenge (${res.status}).`
          );
          return;
        }
        const data = (await res.json()) as Challenge;
        setChallenge(data);
      } catch (e) {
        if (cancelled) return;
        setChallengeError(
          e instanceof Error ? e.message : "Network error fetching challenge."
        );
      }
    }
    fetchChallenge();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!challenge) {
        setError("Challenge not ready yet — wait a moment and retry.");
        setBusy(false);
        return;
      }
      if (Date.now() > challenge.expiresAt) {
        setError("Challenge expired — refresh the page to get a new one.");
        setBusy(false);
        return;
      }

      const trimmed = secret.trim();
      if (!trimmed) {
        setError("Paste your agent secret key.");
        setBusy(false);
        return;
      }

      // Accept base58-encoded 64-byte tweetnacl secretKey (the canonical
      // export from @vdm-nexus/sdk and Solana wallet keypairs).
      let secretBytes: Uint8Array;
      try {
        secretBytes = bs58.decode(trimmed);
      } catch {
        setError("Secret must be base58-encoded.");
        setBusy(false);
        return;
      }
      if (secretBytes.length !== 64) {
        setError(
          `Expected a 64-byte Ed25519 secret key, got ${secretBytes.length} bytes.`
        );
        setBusy(false);
        return;
      }

      const keypair = nacl.sign.keyPair.fromSecretKey(secretBytes);
      const pubkey = bs58.encode(keypair.publicKey);

      // Nonce is hex from the server.
      const nonceBytes = Uint8Array.from(
        challenge.nonce.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );
      const signature = nacl.sign.detached(nonceBytes, secretBytes);
      const signatureB58 = bs58.encode(signature);

      const res = await fetch("/api/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pubkey,
          nonce: challenge.nonce,
          signature: signatureB58,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body?.error === "string"
            ? body.error
            : `Sign-in failed (${res.status}).`
        );
        setBusy(false);
        // Zero the secret out of state on failure so it isn't sitting in
        // memory after a typo. Also drop the consumed challenge — the
        // server invalidated it.
        setSecret("");
        setChallenge(null);
        return;
      }

      // Wipe the secret before navigating — the form remains rendered
      // briefly while the router pushes.
      setSecret("");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
      setBusy(false);
    }
  }

  // Surface the "Sign-in is being configured" notice inline if the
  // server reported `not_configured`. Other fetch errors render as a
  // generic banner with a retry hint.
  if (challengeError) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {challengeError}
        </div>
        <button
          type="button"
          onClick={() => {
            setChallengeError(null);
            // Re-trigger the effect by remounting via location reload —
            // simplest reliable way without rolling our own retry state.
            window.location.reload();
          }}
          className="text-xs text-text-muted underline underline-offset-4 transition-colors hover:text-text"
        >
          Retry
        </button>
      </div>
    );
  }

  const ready = challenge !== null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          Agent secret key (base58, 64 bytes)
        </span>
        <textarea
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          rows={3}
          className="w-full resize-none rounded-lg border border-soft bg-bg/80 px-3 py-2 font-mono text-xs text-text placeholder:text-text-muted/60 focus:border-accent-indigo/60 focus:outline-none focus:ring-1 focus:ring-accent-indigo/40"
          placeholder="5jH7...3kQp"
          disabled={busy}
        />
      </label>

      <p className="text-[11px] text-text-muted">
        The secret never leaves your browser — it signs a server-issued
        nonce in-place; only the resulting signature + pubkey are sent.
        v0 only — IndexedDB browser wallet lands in v1.
      </p>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={busy || !ready}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Signing…" : ready ? "Sign in" : "Loading challenge…"}
      </button>

      <p className="text-[10px] text-text-muted">
        {ready ? (
          <>Challenge expires in {expiresInSeconds(challenge!.expiresAt)}s · single-use · HttpOnly cookie</>
        ) : (
          "Fetching one-time challenge…"
        )}
      </p>
    </form>
  );
}

function expiresInSeconds(expiresAt: number): number {
  return Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
}
