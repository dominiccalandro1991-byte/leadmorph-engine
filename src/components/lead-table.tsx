import { Mail, Phone, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignalHelix } from "@/components/signal-helix";
import { CREDIT } from "@/lib/helix-lattice";
import { useMorphStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LeadTable() {
  const leads = useMorphStore((s) => s.leads);
  const toggleSelect = useMorphStore((s) => s.toggleSelect);
  const selectTop = useMorphStore((s) => s.selectTop);
  const clearSelection = useMorphStore((s) => s.clearSelection);
  const setStudioId = useMorphStore((s) => s.setStudioId);
  const selected = leads.filter((l) => l.selected).length;

  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
        <p className="font-display text-xl">No leads on the lattice</p>
        <p className="mt-1 text-sm text-muted">Upload a CSV or load the sample roster.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] tracking-widest text-muted uppercase">Lattice</p>
          <p className="text-sm">
            <span className="font-mono tabular-nums">{selected}</span> selected · morph cap{" "}
            {CREDIT.maxLeads}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => selectTop(CREDIT.maxLeads)}>
            Select top {CREDIT.maxLeads}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {leads.map((lead) => {
          const { atom, signals } = lead;
          return (
            <li
              key={atom.id}
              className={cn(
                "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center",
                lead.selected && "bg-surface-2/40",
              )}
            >
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={lead.selected}
                  onChange={() => toggleSelect(atom.id)}
                  className="mt-1 size-4 accent-accent"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{atom.fullName}</span>
                    <span className="font-mono text-xs tabular-nums text-accent">
                      {signals.morphScore}
                    </span>
                    {lead.status === "morphed" && <Badge variant="accent">Morphed</Badge>}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {atom.title || "No title"}
                    {atom.company ? ` · ${atom.company}` : ""}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-subtle">
                    <Badge variant="outline">{signals.persona}</Badge>
                    <span className="capitalize">{signals.companyTier}</span>
                    {atom.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3" />
                        {atom.email}
                      </span>
                    )}
                    {atom.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" />
                        {atom.phone}
                      </span>
                    )}
                    {atom.linkedin && (
                      <span className="inline-flex items-center gap-1">
                        <Linkedin className="size-3" />
                        LinkedIn
                      </span>
                    )}
                  </span>
                </span>
              </label>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <SignalHelix signals={signals} />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setStudioId(atom.id)}
                >
                  Open
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
