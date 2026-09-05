import { createServerFn } from "@tanstack/react-start";
import { CREDIT } from "./helix-lattice";
import type { MorphRequest, MorphResponse, MorphLeadResult, MorphCopy } from "./morph-types";
import { compileMorphPrompt } from "./prompt-compiler";

export const getAiStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(process.env.XAI_API_KEY) };
});

export const morphLeads = createServerFn({ method: "POST" })
  .validator((input: MorphRequest) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    if (!Array.isArray(input.leads) || input.leads.length < 1 || input.leads.length > CREDIT.maxLeads) {
      throw new Error(`Select 1–${CREDIT.maxLeads} leads`);
    }
    if (
      !Array.isArray(input.channels) ||
      input.channels.length < 1 ||
      input.channels.length > CREDIT.maxChannels
    ) {
      throw new Error(`Select 1–${CREDIT.maxChannels} channels`);
    }
    return input;
  })
  .handler(async ({ data }): Promise<MorphResponse> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI is not available in this environment" };

    const prompt = compileMorphPrompt(data);
    const body = {
      model: "grok-4.5",
      temperature: 0.5,
      max_tokens: 1600,
      response_format: { type: "json_object" as const },
      messages: [
        {
          role: "system",
          content:
            "You write sendable B2B outreach. Return only valid JSON matching the schema. No markdown.",
        },
        { role: "user", content: prompt },
      ],
    };

    const first = await callXai(apiKey, body);
    if (first.ok) return first;
    // One retry on parse/network, then surface the error.
    const second = await callXai(apiKey, body);
    return second;
  });

async function callXai(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<MorphResponse> {
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: `xAI API error ${res.status}` };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const parsed = parseMorphJson(text);
    if (!parsed) return { ok: false, error: "Could not parse generated copy" };
    return { ok: true, leads: parsed };
  } catch {
    return { ok: false, error: "Network error talking to xAI" };
  }
}

function parseMorphJson(text: string): MorphLeadResult[] | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const data = JSON.parse(stripped) as { leads?: unknown };
    if (!Array.isArray(data.leads)) return null;
    const out: MorphLeadResult[] = [];
    for (const item of data.leads) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const id = typeof rec.id === "string" ? rec.id : "";
      if (!id) continue;
      const enr = (rec.enrichment ?? {}) as Record<string, unknown>;
      const ch = (rec.channels ?? {}) as Record<string, unknown>;
      out.push({
        id,
        enrichment: {
          persona: str(enr.persona),
          pain: str(enr.pain),
          hook: str(enr.hook),
          proofAngle: str(enr.proofAngle),
          companySnapshot: str(enr.companySnapshot),
        },
        channels: normalizeChannels(ch),
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeChannels(ch: Record<string, unknown>): MorphCopy {
  const copy: MorphCopy = {};
  if (ch.email && typeof ch.email === "object") {
    const e = ch.email as Record<string, unknown>;
    copy.email = { subject: str(e.subject), body: str(e.body), ps: str(e.ps) };
  }
  if (ch.linkedin && typeof ch.linkedin === "object") {
    const l = ch.linkedin as Record<string, unknown>;
    copy.linkedin = { connectionNote: str(l.connectionNote), followUp: str(l.followUp) };
  }
  if (ch.call && typeof ch.call === "object") {
    const c = ch.call as Record<string, unknown>;
    const discovery = Array.isArray(c.discovery)
      ? c.discovery.map((d) => str(d)).filter(Boolean)
      : [];
    copy.call = { opener: str(c.opener), discovery, close: str(c.close) };
  }
  if (ch.sms && typeof ch.sms === "object") {
    const s = ch.sms as Record<string, unknown>;
    copy.sms = { text: str(s.text) };
  }
  return copy;
}
