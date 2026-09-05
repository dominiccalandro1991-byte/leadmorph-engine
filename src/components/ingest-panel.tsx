import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMorphStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function IngestPanel() {
  const ingestCsv = useMorphStore((s) => s.ingestCsv);
  const loadSample = useMorphStore((s) => s.loadSample);
  const sourceName = useMorphStore((s) => s.sourceName);
  const leadCount = useMorphStore((s) => s.leads.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const onFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      ingestCsv(text, file.name);
    },
    [ingestCsv],
  );

  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          "lattice-grid border-b border-border px-5 py-6",
          drag && "bg-surface-2",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files[0];
          if (file) void onFile(file);
        }}
      >
        <p className="text-[11px] tracking-widest text-muted uppercase">Ingest</p>
        <h2 className="mt-1 font-display text-2xl">Drop a roster</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          CSV with name, title, company, email, phone, LinkedIn, industry, notes. Helix
          Lattice maps messy headers automatically.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            <Upload />
            Upload CSV
          </Button>
          <Button type="button" variant="outline" onClick={loadSample}>
            <FileSpreadsheet />
            Load sample
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div>
          <p className="font-mono text-xs text-muted">{sourceName}</p>
          <p className="mt-0.5 text-sm">
            <span className="font-mono tabular-nums">{leadCount}</span> leads on the lattice
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
