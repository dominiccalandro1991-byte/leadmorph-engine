import type { SignalVector } from "@/lib/helix-lattice";
import { cn } from "@/lib/utils";

const AXES: Array<{ key: keyof Pick<SignalVector, "seniority" | "completeness" | "reachability" | "companyGravity">; label: string }> =
  [
    { key: "seniority", label: "Sr" },
    { key: "completeness", label: "Cmp" },
    { key: "reachability", label: "Rch" },
    { key: "companyGravity", label: "Grv" },
  ];

export function SignalHelix({
  signals,
  className,
}: {
  signals: SignalVector;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end gap-1", className)} aria-hidden="true">
      {AXES.map((axis) => {
        const v = signals[axis.key];
        const h = Math.max(3, Math.round(v * 16));
        return (
          <div key={axis.key} className="flex w-2 flex-col items-center gap-0.5">
            <div className="flex h-4 items-end">
              <div className="w-1.5 rounded-full bg-accent" style={{ height: h }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SignalLegend({ signals }: { signals: SignalVector }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {AXES.map((axis) => (
        <div key={axis.key} className="flex items-center justify-between gap-3">
          <dt className="text-muted">{labelOf(axis.key)}</dt>
          <dd className="font-mono tabular-nums text-fg">
            {Math.round(signals[axis.key] * 100)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function labelOf(key: string) {
  if (key === "seniority") return "Seniority";
  if (key === "completeness") return "Completeness";
  if (key === "reachability") return "Reachability";
  return "Company gravity";
}
