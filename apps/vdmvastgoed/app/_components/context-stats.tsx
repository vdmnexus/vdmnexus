import {
  panden,
  huurders,
  getBezettingsgraad,
  getOpenFacturenBedrag,
  facturen,
} from "../../lib/mock-data";

export function ContextStats() {
  const bezetting = getBezettingsgraad();
  const openBedrag = getOpenFacturenBedrag();
  const openCount = facturen.filter(
    (f) => f.status === "open" || f.status === "verlopen"
  ).length;

  const stats = [
    { label: "Bezettingsgraad", value: `${bezetting}%` },
    { label: "Open facturen", value: `${openCount} (€${openBedrag.toLocaleString("nl-NL")})` },
    { label: "Panden", value: String(panden.length) },
    { label: "Huurders", value: String(huurders.length) },
  ];

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-primary-200 bg-white px-4 py-2.5">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-2">
          <span className="text-xs text-primary-400">{stat.label}:</span>
          <span className="text-sm font-semibold text-primary">{stat.value}</span>
          {i < stats.length - 1 && (
            <span className="hidden sm:inline text-primary-200 ml-4">|</span>
          )}
        </div>
      ))}
    </div>
  );
}
