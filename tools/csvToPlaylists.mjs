import fs from "fs";
import path from "path";

function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleIndex = headers.indexOf("title");
  const artistIndex = headers.indexOf("artist");

  if (titleIndex === -1 || artistIndex === -1) {
    throw new Error(
      `CSV must have headers "title" and "artist". Found: ${headers.join(", ")}`
    );
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const title = (cols[titleIndex] ?? "").trim();
    const artist = (cols[artistIndex] ?? "").trim();
    if (!title && !artist) continue;
    rows.push({ title, artist });
  }
  return rows;
}

function toTSArrayConst(constName, items) {
  const safe = (s) => JSON.stringify(String(s ?? ""));
  const lines = items.map(
    (it, idx) =>
      `  { id: ${idx + 1}, title: ${safe(it.title)}, artist: ${safe(it.artist)} },`
  );

  return `export const ${constName} = [\n${lines.join("\n")}\n];\n`;
}

const inputs = [
  { file: "playlist_6.csv", constName: "PLAYLIST_6" },
  { file: "playlist_7.csv", constName: "PLAYLIST_7" },
  { file: "playlist_8.csv", constName: "PLAYLIST_8" },
  { file: "playlist_9.csv", constName: "PLAYLIST_9" },
  { file: "playlist_10.csv", constName: "PLAYLIST_10" },
];

const csvDir = path.join(process.cwd(), "tools", "csv");

let output = `// AUTO-GENERATED FROM CSV\n// Paste into lib/realPlaylists.ts (or replace the matching constants)\n\n`;

for (const inp of inputs) {
  const fullPath = path.join(csvDir, inp.file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Missing: ${fullPath} (skipping)`);
    continue;
  }

  const text = fs.readFileSync(fullPath, "utf8");
  const items = parseCSV(text);

  if (items.length !== 75) {
    console.warn(`${inp.file}: expected 75 rows, got ${items.length}.`);
  }

  output += toTSArrayConst(inp.constName, items) + "\n";
}

const outFile = path.join(process.cwd(), "tools", "playlists_6_10.ts");
fs.writeFileSync(outFile, output, "utf8");
console.log(`Wrote: ${outFile}`);
