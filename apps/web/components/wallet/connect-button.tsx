"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { cn } from "@/lib/utils";
import { DEFAULT_CHAIN, shortAddress, supportedChain } from "@/lib/chains";

/**
 * Connect-wallet control for the nav.
 *
 * Three states: disconnected (connector picker), connected on a supported
 * chain (address + chain + disconnect), connected on anything else (a
 * switch prompt, because nothing on this site works off Robinhood Chain).
 *
 * Rendering is gated on a mounted flag — wagmi restores the previous
 * session from localStorage on the client, so the server HTML would
 * otherwise always say "Connect wallet" and hydration would mismatch.
 */
export function ConnectButton({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const base =
    "rounded-md border px-3.5 py-1.5 text-xs font-medium transition-colors sm:text-sm";

  // Pre-hydration placeholder. Same box, so the nav doesn't jump.
  if (!mounted) {
    return (
      <span
        className={cn(
          base,
          "border-soft bg-surface/60 text-text-muted",
          className
        )}
      >
        Connect wallet
      </span>
    );
  }

  const chain = supportedChain(chainId);
  const wrongNetwork = isConnected && !chain;

  if (wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: DEFAULT_CHAIN.id })}
        disabled={isSwitching}
        className={cn(
          base,
          "border-amber-500/50 bg-amber-500/10 text-amber-200 hover:border-amber-400 disabled:opacity-60",
          className
        )}
      >
        {isSwitching ? "Switching…" : "Wrong network — switch"}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            base,
            "flex items-center gap-2 border-accent-indigo/50 bg-accent-indigo/10 text-text hover:border-accent-indigo"
          )}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
          />
          <span className="font-mono">{shortAddress(address)}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-soft bg-bg/95 p-3 shadow-xl shadow-bg/40 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Network
            </div>
            <div className="mt-1 text-sm text-text">{chain?.name}</div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Address
            </div>
            <div className="mt-1 break-all font-mono text-xs text-text">
              {address}
            </div>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="mt-4 w-full rounded-md border border-soft bg-surface/60 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent-indigo/50 hover:text-text"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Disconnected. One connector → connect straight through; more than one
  // → a picker, because guessing which wallet the visitor wants is worse
  // than one extra click.
  if (connectors.length === 1) {
    return (
      <button
        type="button"
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        className={cn(
          base,
          "border-accent-indigo/60 bg-accent-indigo/20 text-text hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:opacity-60",
          className
        )}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={cn(
          base,
          "border-accent-indigo/60 bg-accent-indigo/20 text-text hover:border-accent-indigo hover:bg-accent-indigo/30 disabled:opacity-60"
        )}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-xl border border-soft bg-bg/95 p-1.5 shadow-xl shadow-bg/40 backdrop-blur">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface/60"
            >
              {connector.name}
            </button>
          ))}
          {error && (
            <p className="px-3 py-2 text-xs text-amber-300">{error.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
