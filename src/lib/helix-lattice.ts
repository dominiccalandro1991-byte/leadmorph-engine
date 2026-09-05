/**
 * Helix Lattice — LeadMorph's proprietary scoring + canonicalize engine.
 *
 * Ingests raw CSV rows, maps headers across a synonym graph, emits a
 * 6-axis SignalVector and MorphScore per lead. Framework-agnostic.
 *
 * Complexity (n = rows, k = columns, s = synonym keys ≈ 40):
 *   canonicalizeHeaders  O(k · s)
 *   atomizeRow           O(k)
 *   extractSignals       O(t)  title tokens, t ≪ 20
 *   rankLattice          O(n log n)
 *   compileRoster        O(n · k)
 */

export const CHANNELS = ["email", "linkedin", "call", "sms"] as const;
export type Channel = (typeof CHANNELS)[number];

export type CompanyTier = "seed" | "growth" | "enterprise" | "unknown";
export type Persona =
  | "Budget Holder"
  | "Champion"
  | "Operator"
  | "Technical Evaluator"
  | "Peer"
  | "Unknown";

export type LeadAtom = {
  id: string;
  raw: Record<string, string>;
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedin: string;
  domain: string;
  industry: string;
  notes: string;
  location: string;
};

export type SignalVector = {
  seniority: number;
  completeness: number;
  reachability: number;
  companyGravity: number;
  channelFitness: Record<Channel, number>;
  morphScore: number;
  persona: Persona;
  inferredPain: string;
  companyTier: CompanyTier;
  hookSeed: string;
};

export type LatticeRow = {
  atom: LeadAtom;
  signals: SignalVector;
};

const HEADER_GRAPH: Record<keyof Omit<LeadAtom, "id" | "raw" | "domain"> | "domain", string[]> = {
  firstName: ["first", "firstname", "first name", "given", "given name"],
  lastName: ["last", "lastname", "last name", "surname", "family"],
  fullName: ["name", "full name", "fullname", "contact", "lead", "contact name"],
  title: ["title", "job title", "role", "position", "job", "designation"],
  company: ["company", "account", "organization", "org", "employer", "firm"],
  email: ["email", "e-mail", "work email", "mail", "email address"],
  phone: ["phone", "mobile", "cell", "telephone", "tel", "phone number"],
  linkedin: ["linkedin", "linkedin url", "li", "profile", "linkedin profile"],
  domain: ["domain", "website", "url", "site", "company domain", "web"],
  industry: ["industry", "vertical", "sector", "market"],
  notes: ["notes", "note", "comment", "comments", "context", "research"],
  location: ["location", "city", "region", "geo", "hq", "country"],
};

const SENIORITY_WEIGHTS: Array<{ re: RegExp; w: number }> = [
  { re: /\b(intern|assistant|coordinator|associate)\b/i, w: 0.18 },
  { re: /\b(specialist|analyst|representative|rep|sdr|bdr)\b/i, w: 0.32 },
  { re: /\b(manager|lead|ae|account executive)\b/i, w: 0.52 },
  { re: /\b(senior|sr\.?|principal|staff)\b/i, w: 0.62 },
  { re: /\b(head|director|dir\.?)\b/i, w: 0.78 },
  { re: /\b(vp|vice president|svp|evp)\b/i, w: 0.88 },
  { re: /\b(chief|c[xo]o|founder|co-founder|owner|partner|president)\b/i, w: 0.96 },
];

const TIER_MARKERS: Array<{ re: RegExp; tier: CompanyTier }> = [
  { re: /\b(inc|corp|corporation|group|holdings|international|global|plc|ag)\b/i, tier: "enterprise" },
  { re: /\b(labs|studio|collective|ventures|capital)\b/i, tier: "growth" },
  { re: /\b(llc|ltd|gmbh|startup|co\.?)\b/i, tier: "seed" },
];

const PAIN_BY_INDUSTRY: Record<string, string> = {
  saas: "Pipeline coverage is thin and SDRs spend cycles on generic sequences.",
  fintech: "Trust and compliance slow every new vendor conversation.",
  healthcare: "Admin burden and fragmented systems stall buying committees.",
  logistics: "Margin leak from manual coordination across carriers and docks.",
  manufacturing: "Downtime and tribal knowledge make change feel expensive.",
  realestate: "Lead response lag kills conversions against faster operators.",
  agency: "Retainer churn from unprovable outbound ROI.",
  default: "Outbound is high-volume and low-signal — personalization does not scale.",
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[_./-]+/g, " ").replace(/\s+/g, " ").trim();
}

function pick(raw: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const hit = raw[key];
    if (hit && hit.trim()) return hit.trim();
  }
  return "";
}

/** O(k · s) — map arbitrary CSV headers onto the LeadAtom lattice. */
export function canonicalizeHeaders(headers: string[]): Record<string, string> {
  const mapped: Record<string, string> = {};
  const used = new Set<string>();
  for (const header of headers) {
    const n = norm(header);
    for (const [field, synonyms] of Object.entries(HEADER_GRAPH)) {
      if (used.has(field)) continue;
      if (synonyms.some((syn) => n === syn || n.includes(syn) || syn.includes(n))) {
        mapped[header] = field;
        used.add(field);
        break;
      }
    }
  }
  return mapped;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function domainFrom(email: string, explicit: string, company: string): string {
  if (explicit) return explicit.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const at = email.indexOf("@");
  if (at > 0) return email.slice(at + 1).toLowerCase();
  if (company) return company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
  return "";
}

function hashId(input: string, index: number): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `lm_${(h >>> 0).toString(16)}_${index}`;
}

/** O(k) — project one raw row onto a LeadAtom. */
export function atomizeRow(
  raw: Record<string, string>,
  headerMap: Record<string, string>,
  index: number,
): LeadAtom {
  const projected: Record<string, string> = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = headerMap[header];
    if (field) projected[field] = value;
  }
  const fullFromParts = [projected.firstName, projected.lastName].filter(Boolean).join(" ");
  const fullName = projected.fullName || fullFromParts || `Lead ${index + 1}`;
  const parts = splitName(fullName);
  const email = projected.email ?? "";
  const company = projected.company ?? "";
  const domain = domainFrom(email, projected.domain ?? "", company);
  return {
    id: hashId(`${fullName}|${email}|${company}`, index),
    raw,
    firstName: projected.firstName || parts.firstName,
    lastName: projected.lastName || parts.lastName,
    fullName,
    title: projected.title ?? "",
    company,
    email,
    phone: projected.phone ?? "",
    linkedin: projected.linkedin ?? "",
    domain,
    industry: projected.industry ?? "",
    notes: projected.notes ?? "",
    location: projected.location ?? "",
  };
}

function seniorityOf(title: string): number {
  let best = 0.28;
  for (const { re, w } of SENIORITY_WEIGHTS) {
    if (re.test(title) && w > best) best = w;
  }
  return best;
}

function personaOf(title: string): Persona {
  if (!title.trim()) return "Unknown";
  if (/\b(chief|c[xo]o|founder|owner|partner|president|vp|vice president)\b/i.test(title)) {
    return "Budget Holder";
  }
  if (/\b(head|director|dir\.?)\b/i.test(title)) return "Champion";
  if (/\b(engineer|architect|developer|devops|security|it |technical)\b/i.test(title)) {
    return "Technical Evaluator";
  }
  if (/\b(sdr|bdr|ae|account executive|sales development)\b/i.test(title)) return "Peer";
  if (/\b(manager|lead|operator)\b/i.test(title)) return "Operator";
  return "Champion";
}

function tierOf(company: string, domain: string): CompanyTier {
  for (const { re, tier } of TIER_MARKERS) {
    if (re.test(company)) return tier;
  }
  if (/\.(gov|edu|mil)$/i.test(domain)) return "enterprise";
  if (company.length > 18) return "growth";
  return company ? "seed" : "unknown";
}

function industryKey(industry: string): string {
  const n = norm(industry);
  if (/saas|software|cloud/.test(n)) return "saas";
  if (/fin|bank|pay|insur/.test(n)) return "fintech";
  if (/health|med|pharma|clinic/.test(n)) return "healthcare";
  if (/logist|ship|freight|supply/.test(n)) return "logistics";
  if (/manufac|industrial|factory/.test(n)) return "manufacturing";
  if (/real estate|proptech|broker/.test(n)) return "realestate";
  if (/agency|market|creative/.test(n)) return "agency";
  return "default";
}

function painOf(industry: string, persona: Persona): string {
  const base = PAIN_BY_INDUSTRY[industryKey(industry)] ?? PAIN_BY_INDUSTRY.default;
  if (persona === "Budget Holder") return `${base} Leadership needs a measurable lift, not another tool.`;
  if (persona === "Technical Evaluator") return `${base} Integration risk is the silent no.`;
  if (persona === "Peer") return `${base} Reps need sequences that do not sound templated.`;
  return base ?? "Outbound is high-volume and low-signal.";
}

function hookSeed(atom: LeadAtom, persona: Persona): string {
  const company = atom.company || "their team";
  if (atom.notes) return `Open on: ${atom.notes.slice(0, 90)}`;
  if (persona === "Budget Holder") return `Open on pipeline efficiency at ${company}`;
  if (persona === "Technical Evaluator") return `Open on implementation surface at ${company}`;
  if (atom.industry) return `Open on ${atom.industry} outbound coverage`;
  return `Open on a specific ${atom.title || "role"} outcome`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** O(1) relative to roster — extract the 6-axis vector for one atom. */
export function extractSignals(atom: LeadAtom): SignalVector {
  const filled = [
    atom.fullName,
    atom.title,
    atom.company,
    atom.email,
    atom.phone,
    atom.linkedin,
    atom.industry,
    atom.notes,
  ].filter((v) => v.trim().length > 0).length;
  const completeness = filled / 8;
  const seniority = seniorityOf(atom.title);
  const persona = personaOf(atom.title);
  const companyTier = tierOf(atom.company, atom.domain);
  const channelFitness: Record<Channel, number> = {
    email: atom.email.includes("@") ? 0.92 : 0.18,
    linkedin: atom.linkedin || atom.title ? 0.84 : 0.28,
    call: atom.phone ? 0.88 : 0.12,
    sms: atom.phone ? 0.7 : 0.08,
  };
  const reachability =
    0.4 * channelFitness.email +
    0.3 * channelFitness.linkedin +
    0.2 * channelFitness.call +
    0.1 * channelFitness.sms;
  const gravityMap: Record<CompanyTier, number> = {
    enterprise: 0.92,
    growth: 0.7,
    seed: 0.48,
    unknown: 0.3,
  };
  const companyGravity = gravityMap[companyTier];
  const morphScore = Math.round(
    100 *
      clamp01(
        0.34 * seniority +
          0.22 * completeness +
          0.2 * reachability +
          0.16 * companyGravity +
          0.08 * Math.max(...Object.values(channelFitness)),
      ),
  );
  return {
    seniority,
    completeness,
    reachability,
    companyGravity,
    channelFitness,
    morphScore,
    persona,
    inferredPain: painOf(atom.industry, persona),
    companyTier,
    hookSeed: hookSeed(atom, persona),
  };
}

/** O(n log n) — rank by MorphScore desc, stable on id. */
export function rankLattice(rows: LatticeRow[]): LatticeRow[] {
  return [...rows].sort((a, b) => {
    const d = b.signals.morphScore - a.signals.morphScore;
    return d !== 0 ? d : a.atom.id.localeCompare(b.atom.id);
  });
}

/** O(n · k) — full CSV → ranked lattice. */
export function compileRoster(rows: Record<string, string>[]): LatticeRow[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0] ?? {});
  const headerMap = canonicalizeHeaders(headers);
  const lattice = rows.map((raw, index) => {
    const atom = atomizeRow(raw, headerMap, index);
    return { atom, signals: extractSignals(atom) };
  });
  return rankLattice(lattice);
}

export const CREDIT = {
  starting: 120,
  enrich: 1,
  copyPerChannel: 2,
  grant: 40,
  maxLeads: 3,
  maxChannels: 3,
} as const;

/** O(1) — credits required for a morph batch. */
export function creditCost(leadCount: number, channelCount: number): number {
  if (leadCount <= 0 || channelCount <= 0) return 0;
  return leadCount * (CREDIT.enrich + CREDIT.copyPerChannel * channelCount);
}

export function bestChannels(fitness: Record<Channel, number>, n = 2): Channel[] {
  return CHANNELS.slice()
    .sort((a, b) => fitness[b] - fitness[a])
    .slice(0, n);
}
