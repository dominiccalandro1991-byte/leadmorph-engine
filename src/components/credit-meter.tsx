import { CREDIT } from "@/lib/helix-lattice";
import { useMorphStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CreditMeter({ compact = false }: { compact?: boolean }) {
  const credits = useMorphStore((s) => s.credits);
  const pct = Math.max(0, Math.min(100, (credits / (CREDIT.starting + CREDIT.grant)) * 100));
  const low = credits < 20;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2",
        compact && "min-w-0",
      )}
      aria-label={`${credits} credits remaining`}
    >
      <div className="relative size-9 shrink-0">
        <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            className="text-surface-2"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="currentColor"
            className={low ? "text-warn" : "text-accent"}
            strokeWidth="3"
            strokeDasharray={`${(pct / 100) * 87.96} 87.96`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="font-mono text-sm tabular-nums leading-none text-fg">{credits}</p>
        <p className="mt-0.5 text-[11px] tracking-wide text-muted uppercase">credits</p>
      </div>
    </div>
  );
}
