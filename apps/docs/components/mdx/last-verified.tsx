/**
 * <LastVerified /> — stamp showing when the surrounding code sample was
 * last confirmed to work end-to-end against the live API, with a link
 * to the proof receipt. Pinned on `/docs/quickstart` and
 * `/docs/first-payment` so visitors can tell at a glance whether the
 * sample below is from this week or rotted-three-months-ago.
 *
 * The "proof" is a /r/<id> permalink — a real receipt from the actual
 * canonical test run. Costs nothing to keep current; updating just
 * means editing the date + id when the test wallet runs a fresh
 * smoke. Cheaper than a CI badge and more concrete.
 */

export function LastVerified({
  date,
  receiptId,
  label = "Last verified working",
}: {
  /** ISO date string, e.g. "2026-05-23". */
  date: string;
  /** Receipt id at vdmnexus.com/r/<id>. */
  receiptId: string;
  /** Override the leading label. Default fits most contexts. */
  label?: string;
}) {
  const receiptUrl = `https://vdmnexus.com/r/${receiptId}`;
  return (
    <div
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        margin: "16px 0",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #1e1e2e",
        background: "rgba(16, 185, 129, 0.06)",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
        fontSize: 12,
        color: "#94a3b8",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#34d399",
          boxShadow: "0 0 0 3px rgba(16, 185, 129, 0.18)",
        }}
        aria-hidden
      />
      <span>{label}</span>
      <time dateTime={date} style={{ color: "#f1f5f9" }}>
        {date}
      </time>
      <span style={{ color: "rgba(148, 163, 184, 0.4)" }} aria-hidden>
        ·
      </span>
      <a
        href={receiptUrl}
        target="_blank"
        rel="noreferrer noopener"
        style={{ color: "#6366f1", textDecoration: "none" }}
      >
        receipt {receiptId.slice(0, 8)}↗
      </a>
    </div>
  );
}
