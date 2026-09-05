import type { Channel } from "./helix-lattice";

export type Tone = "direct" | "consultative" | "bold";

export type SenderProfile = {
  name: string;
  title: string;
  company: string;
  product: string;
  valueProp: string;
  tone: Tone;
};

export type MorphLeadInput = {
  id: string;
  fullName: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedin: string;
  industry: string;
  location: string;
  notes: string;
  persona: string;
  morphScore: number;
  painSeed: string;
  hookSeed: string;
};

export type MorphRequest = {
  sender: SenderProfile;
  channels: Channel[];
  leads: MorphLeadInput[];
};

export type EmailCopy = { subject: string; body: string; ps: string };
export type LinkedinCopy = { connectionNote: string; followUp: string };
export type CallCopy = { opener: string; discovery: string[]; close: string };
export type SmsCopy = { text: string };

export type MorphCopy = {
  email?: EmailCopy;
  linkedin?: LinkedinCopy;
  call?: CallCopy;
  sms?: SmsCopy;
};

export type Enrichment = {
  persona: string;
  pain: string;
  hook: string;
  proofAngle: string;
  companySnapshot: string;
};

export type MorphLeadResult = {
  id: string;
  enrichment: Enrichment;
  channels: MorphCopy;
};

export type MorphOk = { ok: true; leads: MorphLeadResult[] };
export type MorphErr = { ok: false; error: string };
export type MorphResponse = MorphOk | MorphErr;
