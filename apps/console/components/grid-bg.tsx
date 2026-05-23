import { cn } from "@/lib/utils";

type Variant = "grid" | "dots";

export function GridBg({
  variant = "grid",
  className,
  fade = true,
}: {
  variant?: Variant;
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 animate-grid-pulse",
          variant === "grid" ? "bg-grid" : "bg-dot-matrix"
        )}
      />
      {fade && (
        <>
          <div className="absolute inset-0 bg-radial-fade" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
        </>
      )}
    </div>
  );
}
