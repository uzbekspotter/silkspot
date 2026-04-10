/**
 * Import aircraft_types from CSV (Manufacturer, Model, Code (ICAO), Classes, Engines).
 * Uses service role. Dedupes by ICAO (one row per code — keeps longest Model name).
 *
 * Usage:
 *   npx tsx scripts/import-aircraft-types-csv.ts [path/to.csv] [--dry-run]
 * Default CSV (first match): repo data/aircraft_types.csv, then ../aircraft_types.csv.
 *
 * Env: SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
 * Loads `.env` and `.env.local` from repo root (next to package.json), not only cwd.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(REPO_ROOT, '.env') });
dotenv.config({ path: path.join(REPO_ROOT, '.env.local') });

type CsvRow = Record<string, string>;

// Minimal CSV parser (quoted fields) — same idea as import-ourairports.ts
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function csvToObjects(text: string): CsvRow[] {
  const grid = parseCsv(text);
  const header = grid[0] ?? [];
  const out: CsvRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const vals = grid[r];
    if (vals.length === 0) continue;
    const obj: CsvRow = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = vals[c] ?? '';
    out.push(obj);
  }
  return out;
}

/** ICAO type designator: middle digit = engine count (L2J, H2T, L8J, …). */
function parseEngineCount(engines: string): number | null {
  const t = engines.trim().toUpperCase();
  const m = /^[A-Z](\d)([A-Z])$/.exec(t);
  if (m) return parseInt(m[1], 10);
  return null;
}

function trunc(s: string, maxLen: number, label: string, ctx: string): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  console.warn(`[warn] ${label} > ${maxLen} chars, truncated: ${ctx.slice(0, 60)}…`);
  return t.slice(0, maxLen);
}

function normalizeIcao(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  if (t.length > 4) {
    console.warn(`[warn] ICAO too long, skipped: ${t}`);
    return null;
  }
  return t;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--dry-run');
  const dryRun = process.argv.includes('--dry-run');

  const candidates = [
    path.join(REPO_ROOT, 'data', 'aircraft_types.csv'),
    path.resolve(REPO_ROOT, '..', 'aircraft_types.csv'),
  ];
  const defaultCsv = candidates.find((p) => fs.existsSync(p)) ?? candidates[0]!;
  const csvPath = path.resolve(args[0] ?? defaultCsv);

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV not found: ${csvPath}\nPut file at data/aircraft_types.csv or pass path as first argument.`
    );
  }

  const text = fs.readFileSync(csvPath, 'utf8');
  const objects = csvToObjects(text);

  type Acc = { manufacturer: string; model: string; classes: string; engines: string };
  const byIcao = new Map<string, Acc>();

  for (const row of objects) {
    const manufacturer = row['Manufacturer']?.trim() ?? '';
    const model = row['Model']?.trim() ?? '';
    const codeRaw = row['Code (ICAO)'] ?? row['Code(ICAO)'] ?? '';
    const classes = row['Classes']?.trim() ?? '';
    const engines = row['Engines']?.trim() ?? '';

    const icao = normalizeIcao(codeRaw);
    if (!icao) continue;
    if (!manufacturer || !model) {
      console.warn(`[warn] skip row (empty manufacturer/model) ICAO=${icao}`);
      continue;
    }

    const next: Acc = { manufacturer, model, classes, engines };
    const prev = byIcao.get(icao);
    if (!prev) {
      byIcao.set(icao, next);
      continue;
    }
    if (model.length > prev.model.length) byIcao.set(icao, next);
    else if (model.length === prev.model.length && model.localeCompare(prev.model) > 0) byIcao.set(icao, next);
  }

  const rows: {
    icao_code: string;
    name: string;
    manufacturer: string;
    category: string | null;
    engine_count: number | null;
  }[] = [];

  for (const [icao_code, v] of byIcao) {
    const name = trunc(v.model, 100, 'name', v.model);
    const manufacturer = trunc(v.manufacturer, 50, 'manufacturer', v.manufacturer);
    const categoryRaw = v.classes.trim();
    const category =
      categoryRaw.length === 0 ? null : trunc(categoryRaw, 30, 'category', categoryRaw) || null;
    const engine_count = parseEngineCount(v.engines);

    rows.push({ icao_code, name, manufacturer, category, engine_count });
  }

  rows.sort((a, b) => a.icao_code.localeCompare(b.icao_code));

  console.log(
    `CSV rows: ${objects.length} → unique ICAO: ${rows.length} (deduped ${objects.length - rows.length})`
  );

  if (dryRun) {
    console.log('Dry run — first 5 rows:', rows.slice(0, 5));
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL) {
    throw new Error(
      `Missing SUPABASE_URL (or VITE_SUPABASE_URL).\n` +
        `Add them to ${path.join(REPO_ROOT, '.env')} (copy from .env.example).\n` +
        `Server import needs at least: VITE_SUPABASE_URL or SUPABASE_URL, plus SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.`
    );
  }
  if (!SERVICE_KEY) {
    throw new Error(
      `Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.\n` +
        `These are required for upsert (not the anon key). See .env.example → «server scripts».`
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from('aircraft_types').upsert(batch, { onConflict: 'icao_code' });
    if (error) throw error;
    process.stdout.write(`\rUpserted ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\nDone.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
