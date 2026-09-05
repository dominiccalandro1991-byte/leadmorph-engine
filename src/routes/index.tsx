import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CopyStudio } from "@/components/copy-studio";
import { IngestPanel } from "@/components/ingest-panel";
import { LeadTable } from "@/components/lead-table";
import { LedgerPanel } from "@/components/ledger-panel";
import { MorphDock } from "@/components/morph-dock";
import { SenderPanel } from "@/components/sender-panel";
import { useMorphStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const view = useMorphStore((s) => s.view);
  return (
    <AppShell>
      {view === "pipeline" && <PipelineView />}
      {view === "studio" && <CopyStudio />}
      {view === "ledger" && <LedgerPanel />}
    </AppShell>
  );
}

function PipelineView() {
  return (
    <div className="stagger-in flex flex-col gap-6">
      <div>
        <p className="text-[11px] tracking-widest text-muted uppercase">Pipeline</p>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl">Score the roster. Morph the send.</h1>
        <p className="mt-3 max-w-xl text-sm text-muted sm:text-base">
          Helix Lattice ranks every lead on seniority, completeness, reach, and company gravity —
          then compiles channel-ready copy against your voice.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="flex flex-col gap-4">
          <IngestPanel />
          <LeadTable />
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <MorphDock />
          <SenderPanel />
        </div>
      </div>
    </div>
  );
}
