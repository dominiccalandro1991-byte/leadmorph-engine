import type { Channel } from "./helix-lattice";
import type { MorphLeadInput, MorphRequest } from "./morph-types";

const CHANNEL_SLOTS: Record<Channel, string> = {
  email:
    "email: { subject (≤7 words, no clickbait), body (90–130 words, 1 ask, specific to this person), ps (one line) }",
  linkedin:
    "linkedin: { connectionNote (≤280 chars, no links), followUp (≤500 chars after accept) }",
  call: "call: { opener (1 sentence), discovery (3 short questions), close (1 next-step ask) }",
  sms: "sms: { text (≤160 chars, one idea, no slang pile-on) }",
};

export function compileMorphPrompt(req: MorphRequest): string {
  const channelBlock = req.channels.map((ch) => CHANNEL_SLOTS[ch]).join("\n");
  const leadBlock = req.leads
    .map((lead, i) => renderLead(lead, i + 1))
    .join("\n\n");
  const toneMap = {
    direct: "Short. Concrete. No throat-clearing. One idea per paragraph.",
    consultative: "Curious, specific, peer-to-peer. Diagnose before pitching.",
    bold: "Pointed and confident. Name the cost of inaction without theatrics.",
  } as const;

  return `You are the copy cell of LeadMorph's Helix Lattice. Write original, sendable outreach for each lead.

SENDER
Name: ${req.sender.name}
Title: ${req.sender.title}
Company: ${req.sender.company}
Product: ${req.sender.product}
Value: ${req.sender.valueProp}
Tone: ${req.sender.tone} — ${toneMap[req.sender.tone]}

RULES
- Never invent facts, metrics, or mutual connections.
- Use only the lead fields provided. If a field is empty, do not fake it.
- No emojis. No hype adjectives (game-changing, revolutionary, unlock).
- Specific > clever. Mention title, company, or note when present.
- One clear ask. No calendar links unless the sender value mentions one.
- Do not mention LeadMorph, Helix Lattice, or that this is generated.

CHANNELS (only these)
${channelBlock}

LEADS
${leadBlock}

Return JSON only, shape:
{
  "leads": [
    {
      "id": "lead id",
      "enrichment": {
        "persona": "Budget Holder|Champion|Operator|Technical Evaluator|Peer",
        "pain": "one sentence",
        "hook": "one sentence angle",
        "proofAngle": "what proof the sender should lead with",
        "companySnapshot": "one sentence, no invented numbers"
      },
      "channels": {
        ${req.channels.map((ch) => jsonSlot(ch)).join(",\n        ")}
      }
    }
  ]
}`;
}

function jsonSlot(ch: Channel): string {
  switch (ch) {
    case "email":
      return `"email": { "subject": "", "body": "", "ps": "" }`;
    case "linkedin":
      return `"linkedin": { "connectionNote": "", "followUp": "" }`;
    case "call":
      return `"call": { "opener": "", "discovery": ["", "", ""], "close": "" }`;
    case "sms":
      return `"sms": { "text": "" }`;
  }
}

function renderLead(lead: MorphLeadInput, n: number): string {
  return `Lead ${n} [id=${lead.id}]
- Name: ${lead.fullName}
- Title: ${lead.title || "—"}
- Company: ${lead.company || "—"}
- Email: ${lead.email || "—"}
- Phone: ${lead.phone || "—"}
- LinkedIn: ${lead.linkedin || "—"}
- Industry: ${lead.industry || "—"}
- Location: ${lead.location || "—"}
- Notes: ${lead.notes || "—"}
- Lattice persona: ${lead.persona}
- MorphScore: ${lead.morphScore}
- Pain seed: ${lead.painSeed}
- Hook seed: ${lead.hookSeed}`;
}
