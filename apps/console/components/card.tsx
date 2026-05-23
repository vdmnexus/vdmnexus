import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-soft bg-surface/60 p-6 backdrop-blur",
        "transition-colors duration-200 hover:border-accent-indigo/50",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-accent-indigo/40 bg-accent-indigo/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-text",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo" />
      Coming soon
    </span>
  );
}
