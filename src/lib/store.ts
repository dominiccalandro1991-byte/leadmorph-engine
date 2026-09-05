import { create } from "zustand";
import {
  CHANNELS,
  compileRoster,
  creditCost,
  CREDIT,
  type Channel,
  type LatticeRow,
} from "./helix-lattice";
import { parseCsv } from "./csv";
import { SAMPLE_CSV } from "./sample-leads";
import type { Enrichment, MorphCopy, SenderProfile, Tone } from "./morph-types";

export type ViewId = "pipeline" | "studio" | "ledger";

export type LeadRecord = LatticeRow & {
  selected: boolean;
  status: "ingested" | "morphed";
  enrichment?: Enrichment;
  copy?: MorphCopy;
};

export type LedgerEntry = {
  id: string;
  at: number;
  kind: "grant" | "morph";
  delta: number;
  note: string;
};

export type PersistShape = {
  leads: LeadRecord[];
  credits: number;
  channels: Channel[];
  sender: SenderProfile;
  ledger: LedgerEntry[];
  sourceName: string;
};

type MorphState = PersistShape & {
  view: ViewId;
  hydrated: boolean;
  busy: boolean;
  error: string | null;
  studioId: string | null;
  setView: (view: ViewId) => void;
  hydrate: () => void;
  loadSample: () => void;
  ingestCsv: (text: string, filename: string) => void;
  toggleSelect: (id: string) => void;
  selectTop: (n: number) => void;
  clearSelection: () => void;
  setChannels: (channels: Channel[]) => void;
  toggleChannel: (channel: Channel) => void;
  setSender: (patch: Partial<SenderProfile>) => void;
  setStudioId: (id: string | null) => void;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  grantCredits: () => void;
  applyMorph: (results: Array<{ id: string; enrichment: Enrichment; channels: MorphCopy }>) => void;
  selectedLeads: () => LeadRecord[];
  estimate: () => number;
};

const STORAGE_KEY = "leadmorph.v1";

export const DEFAULT_SENDER: SenderProfile = {
  name: "Alex Rivera",
  title: "Founder",
  company: "LeadMorph",
  product: "Helix Lattice — AI lead morphing for outbound teams",
  valueProp:
    "Turn a cold CSV into ranked, channel-ready sequences in one pass — scored, not sprayed.",
  tone: "direct",
};

function sampleLeads(): LeadRecord[] {
  const { rows } = parseCsv(SAMPLE_CSV);
  return compileRoster(rows).map((row) => ({
    ...row,
    selected: row.signals.morphScore >= 70,
    status: "ingested" as const,
  }));
}

function persist(slice: PersistShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch {
    /* quota */
  }
}

function snapshot(s: MorphState): PersistShape {
  return {
    leads: s.leads,
    credits: s.credits,
    channels: s.channels,
    sender: s.sender,
    ledger: s.ledger,
    sourceName: s.sourceName,
  };
}

const seedLeads = sampleLeads();

export const useMorphStore = create<MorphState>((set, get) => ({
  leads: seedLeads,
  credits: CREDIT.starting,
  channels: ["email", "linkedin"],
  sender: DEFAULT_SENDER,
  ledger: [
    {
      id: "grant_seed",
      at: Date.now(),
      kind: "grant",
      delta: CREDIT.starting,
      note: "Opening allocation",
    },
  ],
  sourceName: "sample-roster.csv",
  view: "pipeline",
  hydrated: false,
  busy: false,
  error: null,
  studioId: seedLeads[0]?.atom.id ?? null,
  setView: (view) => set({ view }),
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true });
        persist(snapshot(get()));
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PersistShape>;
      set({
        leads: parsed.leads ?? get().leads,
        credits: typeof parsed.credits === "number" ? parsed.credits : get().credits,
        channels: parsed.channels ?? get().channels,
        sender: { ...DEFAULT_SENDER, ...parsed.sender },
        ledger: parsed.ledger ?? get().ledger,
        sourceName: parsed.sourceName ?? get().sourceName,
        studioId: parsed.leads?.[0]?.atom.id ?? get().studioId,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  loadSample: () => {
    const leads = sampleLeads();
    set({
      leads,
      sourceName: "sample-roster.csv",
      studioId: leads[0]?.atom.id ?? null,
      error: null,
    });
    persist(snapshot(get()));
  },
  ingestCsv: (text, filename) => {
    const { rows } = parseCsv(text);
    if (rows.length === 0) {
      set({ error: "No rows found in that CSV." });
      return;
    }
    const leads = compileRoster(rows).map((row, i) => ({
      ...row,
      selected: i < CREDIT.maxLeads,
      status: "ingested" as const,
    }));
    set({
      leads,
      sourceName: filename,
      studioId: leads[0]?.atom.id ?? null,
      error: null,
      view: "pipeline",
    });
    persist(snapshot(get()));
  },
  toggleSelect: (id) => {
    set({
      leads: get().leads.map((l) =>
        l.atom.id === id ? { ...l, selected: !l.selected } : l,
      ),
    });
    persist(snapshot(get()));
  },
  selectTop: (n) => {
    const ranked = [...get().leads].sort(
      (a, b) => b.signals.morphScore - a.signals.morphScore,
    );
    const ids = new Set(ranked.slice(0, n).map((l) => l.atom.id));
    set({
      leads: get().leads.map((l) => ({ ...l, selected: ids.has(l.atom.id) })),
    });
    persist(snapshot(get()));
  },
  clearSelection: () => {
    set({ leads: get().leads.map((l) => ({ ...l, selected: false })) });
    persist(snapshot(get()));
  },
  setChannels: (channels) => {
    set({ channels });
    persist(snapshot(get()));
  },
  toggleChannel: (channel) => {
    const cur = get().channels;
    const next = cur.includes(channel)
      ? cur.filter((c) => c !== channel)
      : [...cur, channel].filter((c) => CHANNELS.includes(c));
    if (next.length === 0 || next.length > CREDIT.maxChannels) return;
    set({ channels: next });
    persist(snapshot(get()));
  },
  setSender: (patch) => {
    set({ sender: { ...get().sender, ...patch } });
    persist(snapshot(get()));
  },
  setStudioId: (id) => set({ studioId: id, view: "studio" }),
  setBusy: (busy) => set({ busy }),
  setError: (error) => set({ error }),
  grantCredits: () => {
    const entry: LedgerEntry = {
      id: `grant_${Date.now()}`,
      at: Date.now(),
      kind: "grant",
      delta: CREDIT.grant,
      note: "Demo top-up",
    };
    set({ credits: get().credits + CREDIT.grant, ledger: [entry, ...get().ledger] });
    persist(snapshot(get()));
  },
  applyMorph: (results) => {
    const selected = get().selectedLeads();
    const cost = creditCost(selected.length, get().channels.length);
    const byId = new Map(results.map((r) => [r.id, r]));
    // Fall back to order if model drops ids
    const leads = get().leads.map((lead) => {
      const hit = byId.get(lead.atom.id);
      if (!hit) return lead;
      return {
        ...lead,
        status: "morphed" as const,
        enrichment: hit.enrichment,
        copy: { ...lead.copy, ...hit.channels },
      };
    });
    // If ids missed, stitch by selected order
    const unmatched = results.filter((r) => !leads.some((l) => l.atom.id === r.id));
    if (unmatched.length) {
      let ui = 0;
      for (const lead of leads) {
        if (lead.status === "morphed" && byId.has(lead.atom.id)) continue;
        if (!lead.selected) continue;
        const extra = unmatched[ui++];
        if (!extra) break;
        lead.status = "morphed";
        lead.enrichment = extra.enrichment;
        lead.copy = { ...lead.copy, ...extra.channels };
      }
    }
    const firstMorphed = leads.find((l) => l.selected && l.status === "morphed");
    const entry: LedgerEntry = {
      id: `morph_${Date.now()}`,
      at: Date.now(),
      kind: "morph",
      delta: -cost,
      note: `Morphed ${selected.length} lead${selected.length === 1 ? "" : "s"} · ${get().channels.join(", ")}`,
    };
    set({
      leads,
      credits: Math.max(0, get().credits - cost),
      ledger: [entry, ...get().ledger],
      view: "studio",
      studioId: firstMorphed?.atom.id ?? get().studioId,
      busy: false,
      error: null,
    });
    persist(snapshot(get()));
  },
  selectedLeads: () => get().leads.filter((l) => l.selected),
  estimate: () => creditCost(get().selectedLeads().length, get().channels.length),
}));

export const TONES: { id: Tone; label: string }[] = [
  { id: "direct", label: "Direct" },
  { id: "consultative", label: "Consultative" },
  { id: "bold", label: "Bold" },
];
