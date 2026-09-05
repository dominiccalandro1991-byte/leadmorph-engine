import { CHANNELS, type Channel } from "@/lib/helix-lattice";
import { TONES, useMorphStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Call",
  sms: "SMS",
};

export function SenderPanel() {
  const sender = useMorphStore((s) => s.sender);
  const setSender = useMorphStore((s) => s.setSender);
  const channels = useMorphStore((s) => s.channels);
  const toggleChannel = useMorphStore((s) => s.toggleChannel);

  return (
    <Card>
      <CardHeader>
        <p className="text-[11px] tracking-widest text-muted uppercase">Sender</p>
        <CardTitle>Voice of the sequence</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input value={sender.name} onChange={(e) => setSender({ name: e.target.value })} />
          </Field>
          <Field label="Title">
            <Input value={sender.title} onChange={(e) => setSender({ title: e.target.value })} />
          </Field>
        </div>
        <Field label="Company">
          <Input
            value={sender.company}
            onChange={(e) => setSender({ company: e.target.value })}
          />
        </Field>
        <Field label="Product">
          <Input
            value={sender.product}
            onChange={(e) => setSender({ product: e.target.value })}
          />
        </Field>
        <Field label="Value proposition">
          <Textarea
            rows={3}
            value={sender.valueProp}
            onChange={(e) => setSender({ valueProp: e.target.value })}
          />
        </Field>
        <div>
          <Label className="mb-2 block">Tone</Label>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSender({ tone: t.id })}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm",
                  sender.tone === t.id
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Channels</Label>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((ch) => {
              const on = channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm",
                    on
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border text-muted hover:text-fg",
                  )}
                >
                  {CHANNEL_LABEL[ch]}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
