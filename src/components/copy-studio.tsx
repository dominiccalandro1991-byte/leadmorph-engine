import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignalLegend } from "@/components/signal-helix";
import { CHANNELS, type Channel } from "@/lib/helix-lattice";
import { useMorphStore } from "@/lib/store";
import { toCsv } from "@/lib/csv";
import type { MorphCopy } from "@/lib/morph-types";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Call",
  sms: "SMS",
};

export function CopyStudio() {
  const leads = useMorphStore((s) => s.leads);
  const studioId = useMorphStore((s) => s.studioId);
  const setStudioId = useMorphStore((s) => s.setStudioId);
  const setView = useMorphStore((s) => s.setView);
  const lead = leads.find((l) => l.atom.id === studioId) ?? leads[0];

  if (!lead) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-16 text-center">
        <p className="font-display text-2xl">Studio is empty</p>
        <p className="mt-2 text-sm text-muted">Ingest a roster, then morph a batch.</p>
        <Button className="mt-4" variant="outline" onClick={() => setView("pipeline")}>
          Back to pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <p className="text-[11px] tracking-widest text-muted uppercase">Roster</p>
          <CardTitle className="text-lg">Leads</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 p-2 pt-0">
          {leads.map((row) => (
            <button
              key={row.atom.id}
              type="button"
              onClick={() => setStudioId(row.atom.id)}
              className={cn(
                "flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-left text-sm",
                row.atom.id === lead.atom.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
              )}
            >
              <span className="truncate">{row.atom.fullName}</span>
              <span className="font-mono text-xs tabular-nums text-accent">
                {row.signals.morphScore}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <LeadDetail leadId={lead.atom.id} />
    </div>
  );
}

function LeadDetail({ leadId }: { leadId: string }) {
  const lead = useMorphStore((s) => s.leads.find((l) => l.atom.id === leadId));
  const channels = useMorphStore((s) => s.channels);
  if (!lead) return null;
  const { atom, signals, enrichment, copy } = lead;
  const available = CHANNELS.filter((ch) => Boolean(copy?.[ch]) || channels.includes(ch));
  const defaultCh = available[0] ?? "email";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] tracking-widest text-muted uppercase">Subject</p>
              <CardTitle className="mt-1 text-3xl">{atom.fullName}</CardTitle>
              <p className="mt-1 text-sm text-muted">
                {atom.title}
                {atom.company ? ` · ${atom.company}` : ""}
                {atom.location ? ` · ${atom.location}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl tabular-nums text-accent">{signals.morphScore}</p>
              <p className="text-[11px] tracking-wide text-muted uppercase">MorphScore</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{signals.persona}</Badge>
            <Badge variant="outline" className="capitalize">
              {signals.companyTier}
            </Badge>
            {lead.status === "morphed" && <Badge variant="accent">Morphed</Badge>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] tracking-widest text-muted uppercase">Lattice</p>
            <div className="mt-3">
              <SignalLegend signals={signals} />
            </div>
            <p className="mt-4 text-sm text-muted">{signals.inferredPain}</p>
          </div>
          <div>
            <p className="text-[11px] tracking-widest text-muted uppercase">Enrichment</p>
            {enrichment ? (
              <dl className="mt-3 space-y-3 text-sm">
                <Row k="Persona" v={enrichment.persona} />
                <Row k="Pain" v={enrichment.pain} />
                <Row k="Hook" v={enrichment.hook} />
                <Row k="Proof" v={enrichment.proofAngle} />
                <Row k="Company" v={enrichment.companySnapshot} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Run Morph to write enrichment and channel copy for this lead.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-[11px] tracking-widest text-muted uppercase">Copy</p>
          <CardTitle>Channel output</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultCh}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {available.map((ch) => (
                <TabsTrigger key={ch} value={ch}>
                  {CHANNEL_LABEL[ch]}
                </TabsTrigger>
              ))}
            </TabsList>
            {available.map((ch) => (
              <TabsContent key={ch} value={ch}>
                <ChannelPane channel={ch} copy={copy} />
              </TabsContent>
            ))}
          </Tabs>
          <ExportBar />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5">{v || "—"}</dd>
    </div>
  );
}

function ChannelPane({ channel, copy }: { channel: Channel; copy?: MorphCopy }) {
  if (!copy || !copy[channel]) {
    return (
      <p className="text-sm text-muted">
        No {CHANNEL_LABEL[channel]} copy yet. Select the channel and run Morph.
      </p>
    );
  }
  if (channel === "email" && copy.email) {
    return (
      <div className="flex flex-col gap-4">
        <CopyBlock label="Subject" text={copy.email.subject} />
        <CopyBlock label="Body" text={copy.email.body} multiline />
        {copy.email.ps && <CopyBlock label="P.S." text={copy.email.ps} />}
      </div>
    );
  }
  if (channel === "linkedin" && copy.linkedin) {
    return (
      <div className="flex flex-col gap-4">
        <CopyBlock label="Connection note" text={copy.linkedin.connectionNote} />
        <CopyBlock label="Follow-up" text={copy.linkedin.followUp} multiline />
      </div>
    );
  }
  if (channel === "call" && copy.call) {
    return (
      <div className="flex flex-col gap-4">
        <CopyBlock label="Opener" text={copy.call.opener} />
        <CopyBlock
          label="Discovery"
          text={copy.call.discovery.map((q, i) => `${i + 1}. ${q}`).join("\n")}
          multiline
        />
        <CopyBlock label="Close" text={copy.call.close} />
      </div>
    );
  }
  if (channel === "sms" && copy.sms) {
    return <CopyBlock label="SMS" text={copy.sms.text} />;
  }
  return null;
}

function CopyBlock({
  label,
  text,
  multiline,
}: {
  label: string;
  text: string;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs text-muted">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success("Copied");
            window.setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className={cn(
          "rounded-md border border-border bg-bg p-3 font-sans text-sm whitespace-pre-wrap text-fg",
          !multiline && "font-medium",
        )}
      >
        {text}
      </pre>
    </div>
  );
}

function ExportBar() {
  const allLeads = useMorphStore((s) => s.leads);
  const leads = allLeads.filter((l) => l.status === "morphed");
  const csv = useMemo(() => {
    const rows = leads.map((l) => ({
      name: l.atom.fullName,
      company: l.atom.company,
      title: l.atom.title,
      score: String(l.signals.morphScore),
      persona: l.enrichment?.persona ?? l.signals.persona,
      email_subject: l.copy?.email?.subject ?? "",
      email_body: l.copy?.email?.body ?? "",
      linkedin_note: l.copy?.linkedin?.connectionNote ?? "",
      call_opener: l.copy?.call?.opener ?? "",
      sms: l.copy?.sms?.text ?? "",
    }));
    return toCsv(
      [
        "name",
        "company",
        "title",
        "score",
        "persona",
        "email_subject",
        "email_body",
        "linkedin_note",
        "call_opener",
        "sms",
      ],
      rows,
    );
  }, [leads]);

  if (leads.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "leadmorph-copy.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export CSV
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(csv);
          toast.success("CSV copied");
        }}
      >
        Copy CSV
      </Button>
    </div>
  );
}
