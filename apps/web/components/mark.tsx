/**
 * The VDM Nexus mark.
 *
 * Two vertical guardrails, a tensioned line running between them, and a
 * node ring at the centre where the line passes through. It reads as the
 * product: fixed limits on either side, a decision made in the middle,
 * a rein under tension between them.
 *
 * Every stroke is `currentColor`, so the mark takes the colour of whatever
 * it sits inside — `text-text` in the nav, `text-text-muted` in the footer,
 * `text-accent-indigo` when it needs to carry accent. Never hard-code a
 * fill on it; set the colour on the parent.
 *
 * The same geometry lives at `public/mark.svg` (for anything outside React —
 * emails, decks, third-party embeds) and at `app/icon.svg` (favicon, where
 * the strokes are resolved to a literal colour because a standalone favicon
 * has no `currentColor` to inherit).
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="VDM Nexus"
      className={className}
    >
      {/* guardrails — the two fixed limits the agent operates between */}
      <path
        d="M7 6.5V25.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 6.5V25.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* the rein — a line under tension, passing through the node */}
      <path
        d="M7 6.5C9.6 10 11.2 12.2 12.6 13.9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M19.4 18.1C20.8 19.8 22.4 22 25 25.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* the nexus — where the decision happens, and where it gets signed */}
      <circle
        cx="16"
        cy="16"
        r="3.4"
        stroke="currentColor"
        strokeWidth="2.6"
      />
    </svg>
  );
}

/**
 * Mark + wordmark. The wordmark is HTML text, never baked into the SVG —
 * it stays selectable, scales with the type ramp, and inherits the font.
 *
 * Clear space: the `gap-2.5` plus the nav's own padding keeps at least
 * half the mark's height clear on every side. See `/brand`.
 */
export function Lockup({
  className,
  markClassName = "h-7 w-7",
  wordClassName = "text-lg",
}: {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark className={markClassName} />
      <span
        className={`font-semibold tracking-tight ${wordClassName}`}
        // aria-hidden: the Mark already carries the "VDM Nexus" label, so
        // without this a screen reader announces the name twice.
        aria-hidden
      >
        VDM Nexus
      </span>
    </span>
  );
}
