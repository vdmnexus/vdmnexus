"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import bs58 from "bs58";
import nacl from "tweetnacl";

export function SignInForm({ nonce }: { nonce: string }) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
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
        nonce.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );
      const signature = nacl.sign.detached(nonceBytes, secretBytes);
      const signatureB58 = bs58.encode(signature);

      const res = await fetch("/api/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pubkey,
          nonce,
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
        // memory after a typo.
        setSecret("");
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
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent-indigo/60 bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-text transition-colors hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Signing…" : "Sign in"}
      </button>

      <input type="hidden" value={nonce} readOnly />
    </form>
  );
}
