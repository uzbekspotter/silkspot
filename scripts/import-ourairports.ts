import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type CsvRow = Record<string, string>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function toNum(v: string): number | null {
  const t = v?.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function normalizeCode(v: string, len: number): string | null {
  const t = (v ?? '').trim().toUpperCase();
  if (!t) return null;
  if (t.length !== len) return null;
  return t;
}

// Minimal CSV parser that handles quoted fields and commas/newlines inside quotes.
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

  // last cell
  row.push(cell);
  rows.push(row);
  return rows.filter(r => !(r.length === 1 && r[0] === ''));
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

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}`);
  return await res.text();
}

async function upsertInBatches<T extends Record<string, any>>(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 1000
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw error;
    process.stdout.write(`\r${table}: ${Math.min(i + batch.length, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const onlyWithCodes = (process.env.ONLY_WITH_CODES ?? '1') !== '0';
  const includeSmall = (process.env.INCLUDE_SMALL ?? '1') !== '0';

  const countriesUrl = 'https://davidmegginson.github.io/ourairports-data/countries.csv';
  const airportsUrl = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

  console.log('Downloading OurAirports datasets…');
  const [countriesCsv, airportsCsv] = await Promise.all([fetchText(countriesUrl), fetchText(airportsUrl)]);

  console.log('Parsing countries…');
  const countriesRows = csvToObjects(countriesCsv);
  const countries = countriesRows
    .map(r => ({
      code: (r['code'] ?? '').trim().toUpperCase(),
      name: (r['name'] ?? '').trim(),
      flag_emoji: null as string | null,
    }))
    .filter(r => r.code.length === 2 && r.name.length > 0);

  console.log(`Upserting countries: ${countries.length}`);
  await upsertInBatches(supabase, 'countries', countries, 'code', 1000);

  console.log('Parsing airports…');
  const airportsRows = csvToObjects(airportsCsv);

  const allowedTypes = new Set(['large_airport', 'medium_airport', ...(includeSmall ? ['small_airport'] : []), 'heliport', 'seaplane_base']);

  const airports = airportsRows
    .map(r => {
      const type = (r['type'] ?? '').trim();
      if (!allowedTypes.has(type)) return null;

      const iata = normalizeCode(r['iata_code'] ?? '', 3);
      const icao = normalizeCode(r['gps_code'] ?? '', 4) || normalizeCode(r['ident'] ?? '', 4);
      if (onlyWithCodes && !iata && !icao) return null;

      const name = (r['name'] ?? '').trim();
      if (!name) return null;

      const country_code = normalizeCode(r['iso_country'] ?? '', 2);
      const city = (r['municipality'] ?? '').trim() || null;
      const lat = toNum(r['latitude_deg'] ?? '');
      const lng = toNum(r['longitude_deg'] ?? '');
      const elevation_ft = toNum(r['elevation_ft'] ?? '');

      return {
        iata,
        icao,
        name,
        city,
        country_code,
        lat,
        lng,
        elevation_ft,
        timezone: null as string | null,
      };
    })
    .filter(Boolean) as Array<{
      iata: string | null;
      icao: string | null;
      name: string;
      city: string | null;
      country_code: string | null;
      lat: number | null;
      lng: number | null;
      elevation_ft: number | null;
      timezone: string | null;
    }>;

  // De-dup within this import (prefer rows that have both codes, then ICAO, then IATA)
  const score = (a: { iata: string | null; icao: string | null }) => (a.icao ? 2 : 0) + (a.iata ? 1 : 0);
  const byIcao = new Map<string, typeof airports[number]>();
  const byIata = new Map<string, typeof airports[number]>();

  for (const a of airports) {
    if (a.icao) {
      const prev = byIcao.get(a.icao);
      if (!prev || score(a) > score(prev)) byIcao.set(a.icao, a);
    }
    if (a.iata) {
      const prev = byIata.get(a.iata);
      if (!prev || score(a) > score(prev)) byIata.set(a.iata, a);
    }
  }

  const merged = new Map<string, typeof airports[number]>();
  for (const a of byIcao.values()) merged.set(`icao:${a.icao}`, a);
  for (const a of byIata.values()) merged.set(`iata:${a.iata}`, a);
  const uniqueAirports = Array.from(merged.values());

  // Avoid "onConflict=icao" inserts failing due to duplicate IATA across different ICAOs.
  // Keep IATA only on the best-scored row; drop IATA on the rest.
  const bestByIata = new Map<string, typeof uniqueAirports[number]>();
  for (const a of uniqueAirports) {
    if (!a.iata) continue;
    const prev = bestByIata.get(a.iata);
    if (!prev || score(a) > score(prev)) bestByIata.set(a.iata, a);
  }

  console.log(`Upserting airports: ${uniqueAirports.length} (ONLY_WITH_CODES=${onlyWithCodes ? '1' : '0'}, INCLUDE_SMALL=${includeSmall ? '1' : '0'})`);

  // Upsert by ICAO first (more stable), then by IATA
  const withIcao = uniqueAirports
    .filter(a => !!a.icao)
    .map(a => {
      if (!a.iata) return a;
      const best = bestByIata.get(a.iata);
      if (best !== a) return { ...a, iata: null };
      return a;
    });
  const withIataOnly = uniqueAirports.filter(a => !a.icao && !!a.iata);

  await upsertInBatches(supabase, 'airports', withIcao, 'icao', 1000);
  await upsertInBatches(supabase, 'airports', withIataOnly, 'iata', 1000);

  console.log('Done.');
  console.log('Tip: verify LED/ULLI in Supabase by filtering airports.iata = LED or airports.icao = ULLI.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

