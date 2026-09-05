import { useState } from "react";
import { toast } from "sonner";
import { GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREDIT, creditCost } from "@/lib/helix-lattice";
import { morphLeads } from "@/lib/morph-api";
import { useMorphStore } from "@/lib/store";
import type { MorphLeadInput } from "@/lib/morph-types";

export function MorphDock() {
  const leads = useMorphStore((s) => s.leads);
  const channels = useMorphStore((s) => s.channels);
  const credits = useMorphStore((s) => s.credits);
  const sender = useMorphStore((s) => s.sender);
  const busy = useMorphStore((s) => s.busy);
  const setBusy = useMorphStore((s) => s.setBusy);
  const applyMorph = useMorphStore((s) => s.applyMorph);
  const grantCredits = useMorphStore((s) => s.grantCredits);
  const error = useMorphStore((s) => s.error);
  const setError = useMorphStore((s) => s.setError);
  const [ran, setRan] = useState(false);

  const selectedLeads = leads.filter((l) => l.selected);
  const capped = selectedLeads.slice(0, CREDIT.maxLeads);
  const cost = creditCost(capped.length, channels.length);
  const blocked =
    capped.length === 0 ||
    channels.length === 0 ||
    cost > credits ||
    capped.length > CREDIT.maxLeads;

  async function run() {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    setRan(true);
    const payload = {
      sender,
      channels,
      leads: capped.map(
        (l): MorphLeadInput => ({
          id: l.atom.id,
          fullName: l.atom.fullName,
          title: l.atom.title,
          company: l.atom.company,
          email: l.atom.email,
          phone: l.atom.phone,
          linkedin: l.atom.linkedin,
          industry: l.atom.industry,
          location: l.atom.location,
          notes: l.atom.notes,
          persona: l.signals.persona,
          morphScore: l.signals.morphScore,
          painSeed: l.signals.inferredPain,
          hookSeed: l.signals.hookSeed,
        }),
      ),
    };
    try {
      const res = await morphLeads({ data: payload });
      if (!res.ok) {
        setError(res.error);
        setBusy(false);
        toast.error(res.error);
        return;
      }
      applyMorph(res.leads);
      toast.success(`Morphed ${res.leads.length} lead${res.leads.length === 1 ? "" : "s"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Morph failed";
      setError(msg);
      setBusy(false);
      toast.error(msg);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-[11px] tracking-widest text-muted uppercase">Morph</p>
      <h2 className="mt-1 font-display text-2xl">Run the lattice</h2>
      <p className="mt-2 text-sm text-muted">
        Enrichment plus channel copy. {CREDIT.enrich} credit to enrich, {CREDIT.copyPerChannel}{" "}
        per channel, cap {CREDIT.maxLeads} leads.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Selected</dt>
          <dd className="font-mono tabular-nums">
            {capped.length}
            {selectedLeads.length > CREDIT.maxLeads ? ` of ${selectedLeads.length}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Channels</dt>
          <dd className="font-mono tabular-nums">{channels.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Estimate</dt>
          <dd className="font-mono tabular-nums">{cost} cr</dd>
        </div>
        <div>
          <dt className="text-muted">Balance</dt>
          <dd className="font-mono tabular-nums">{credits} cr</dd>
        </div>
      </dl>
      {selectedLeads.length > CREDIT.maxLeads && (
        <p className="mt-3 text-xs text-warn">
          Only the first {CREDIT.maxLeads} selected leads will run this pass.
        </p>
      )}
      {cost > credits && (
        <p className="mt-3 text-xs text-warn">Not enough credits for this batch.</p>
      )}
      {error && ran && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="flex-1" disabled={blocked || busy} onClick={() => void run()}>
          <GitMerge />
          {busy ? "Morphing…" : "Morph copy"}
        </Button>
        <Button type="button" variant="outline" onClick={grantCredits}>
          Grant {CREDIT.grant}
        </Button>
      </div>
    </div>
  );
}
