import { cn } from "@/lib/cn";
import { heatContext } from "@/lib/heat";

// Display-only venue heat context. Renders nothing below the 28 °C threshold.
// See lib/heat.ts — this is not a model input.
export function HeatBadge({
  city,
  className,
  showTemp = false,
}: {
  city: string;
  className?: string;
  showTemp?: boolean;
}) {
  const ctx = heatContext(city);
  if (!ctx) return null;

  return (
    <span
      title={`Typical afternoon high ~${ctx.tempC}°C — display-only venue context, not a model input`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        ctx.tier === "extreme"
          ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
          : "border-amber-500/25 bg-amber-500/10 text-amber-300/90",
        className,
      )}
    >
      {ctx.label}
      {showTemp && <span className="opacity-70">~{ctx.tempC}°C</span>}
    </span>
  );
}
