import { useEffect } from "react";
import { GitMerge, LayoutGrid, ScrollText } from "lucide-react";
import { Mark } from "@/components/mark";
import { CreditMeter } from "@/components/credit-meter";
import { Button } from "@/components/ui/button";
import { useMorphStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { id: ViewId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
  { id: "studio", label: "Studio", icon: GitMerge },
  { id: "ledger", label: "Ledger", icon: ScrollText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useMorphStore((s) => s.hydrate);
  const view = useMorphStore((s) => s.view);
  const setView = useMorphStore((s) => s.setView);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mark className="text-accent" />
            <div className="min-w-0">
              <p className="font-display text-lg leading-none tracking-tight">LeadMorph</p>
              <p className="hidden text-[11px] tracking-wide text-muted uppercase sm:block">
                Helix Lattice
              </p>
            </div>
          </div>

          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => (
              <Button
                key={item.id}
                variant={view === item.id ? "outline" : "ghost"}
                size="sm"
                onClick={() => setView(item.id)}
                aria-current={view === item.id ? "page" : undefined}
              >
                <item.icon />
                {item.label}
              </Button>
            ))}
          </nav>

          <div className="ml-auto">
            <CreditMeter compact />
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto px-4 pb-3 md:hidden"
          aria-label="Primary mobile"
        >
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "inline-flex h-11 min-w-20 items-center justify-center gap-1.5 rounded-md px-3 text-sm",
                view === item.id
                  ? "bg-surface-2 text-fg"
                  : "text-muted",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
