import { cn } from "@/lib/utils";

/**
 * Small pill marker indicating the protocol is in Beta until v1 ships at
 * the $NEXUS token launch. Sits next to the logo in every site nav.
 *
 * Title (tooltip) carries the longer commitment so the visual stays
 * compact while the meaning is discoverable.
 */
export function BetaPill({ className }: { className?: string }) {
  return (
    <span
      title="Beta — API stable, mainnet live. v1 ships at $NEXUS launch."
      className={cn(
        "inline-flex select-none items-center rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-accent-indigo",
        className
      )}
    >
      Beta
    </span>
  );
}
