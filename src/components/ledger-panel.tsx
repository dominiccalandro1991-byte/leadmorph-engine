import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CREDIT } from "@/lib/helix-lattice";
import { useMorphStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LedgerPanel() {
  const ledger = useMorphStore((s) => s.ledger);
  const credits = useMorphStore((s) => s.credits);
  const grantCredits = useMorphStore((s) => s.grantCredits);
  const spent = ledger.filter((e) => e.delta < 0).reduce((acc, e) => acc + Math.abs(e.delta), 0);
  const granted = ledger.filter((e) => e.delta > 0).reduce((acc, e) => acc + e.delta, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <p className="text-[11px] tracking-widest text-muted uppercase">Meter</p>
          <CardTitle className="font-mono text-4xl tabular-nums">{credits}</CardTitle>
          <p className="text-sm text-muted">credits remaining</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Granted</span>
            <span className="font-mono tabular-nums">{granted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Spent</span>
            <span className="font-mono tabular-nums">{spent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Enrich</span>
            <span className="font-mono tabular-nums">{CREDIT.enrich} / lead</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Copy</span>
            <span className="font-mono tabular-nums">{CREDIT.copyPerChannel} / channel</span>
          </div>
          <Button type="button" variant="outline" onClick={grantCredits}>
            Grant {CREDIT.grant} credits
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <p className="text-[11px] tracking-widest text-muted uppercase">History</p>
          <CardTitle>Usage ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No movements yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {ledger.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">{entry.note}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      {format(entry.at, "MMM d, HH:mm")}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      entry.delta < 0 ? "text-danger" : "text-accent",
                    )}
                  >
                    {entry.delta > 0 ? "+" : ""}
                    {entry.delta}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
