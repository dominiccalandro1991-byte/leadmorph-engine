# LeadMorph

Credit-based AI lead enrichment and multi-channel outreach copy.

Repository: [dominiccalandro1991-byte/leadmorph-engine](https://github.com/dominiccalandro1991-byte/leadmorph-engine)

Drop a CSV of contacts. **Helix Lattice** canonicalizes messy headers, scores each lead on a 6-axis signal vector (seniority, completeness, reachability, company gravity, channel fitness, MorphScore), then compiles structured prompts for email, LinkedIn, call, and SMS. Grok writes the copy. A local credit ledger meters usage.

## Stack

- TanStack Start + React 19
- Tailwind v4
- Zustand (roster, credits, sender profile)
- xAI `grok-4.5` via server functions (`XAI_API_KEY`)

## Helix Lattice

| Axis | What it measures |
| --- | --- |
| Seniority | Title token weights (intern → C-level) |
| Completeness | Filled canonical fields |
| Reachability | Weighted channel fitness |
| Company gravity | Seed / growth / enterprise markers |
| Channel fitness | Email / LinkedIn / call / SMS given available fields |
| MorphScore | Weighted composite, 0–100 |

Deterministic scoring is free. LLM morph costs **1 credit to enrich + 2 credits per channel**, capped at 3 leads × 3 channels per pass.

## Run

```bash
npm install
npm run dev
```

Requires `XAI_API_KEY` on the server for Morph. Ingest and ranking work without it.

## Credits

Opening allocation: 120. Demo top-up: 40. Ledger is stored in the browser (`leadmorph.v1`).
