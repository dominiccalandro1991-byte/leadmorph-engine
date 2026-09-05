/** Minimal RFC4180-ish CSV parser. O(chars). No extra deps. */

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let quoted = false;

  while (i < input.length) {
    const ch = input[i] ?? "";
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field.trim());
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell.length > 0)) records.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) records.push(row);

  const headers = (records[0] ?? []).map((h) => h.trim()).filter(Boolean);
  const rows = records.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

export function toCsv(headers: string[], rows: Array<Record<string, string>>): string {
  const esc = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}
