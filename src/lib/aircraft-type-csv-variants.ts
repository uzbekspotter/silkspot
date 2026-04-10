import type { AircraftType } from '../aviation-data';
import { searchAircraftTypes } from '../aviation-data';
import csvRaw from '../../data/aircraft_types.csv?raw';

type CsvRow = { mfr: string; model: string; icao: string };

let cachedRows: CsvRow[] | null = null;

function loadCsvRows(): CsvRow[] {
  if (cachedRows) return cachedRows;
  const out: CsvRow[] = [];
  const lines = csvRaw.trim().split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const mfr = (parts[0] || '').trim();
    const model = (parts[1] || '').trim();
    const icao = (parts[2] || '').trim().toUpperCase();
    if (!model || !icao) continue;
    out.push({ mfr, model, icao });
  }
  cachedRows = out;
  return out;
}

function toAircraftType(r: CsvRow): AircraftType {
  return {
    name: r.model,
    manufacturer: r.mfr,
    search: `${r.model} ${r.icao} ${r.mfr}`.toLowerCase(),
  };
}

/** CSV-only suggestions (all Model strings per file, including BBJ / Prestige duplicates per ICAO). */
export function searchCsvAircraftTypeVariants(query: string, limit: number): AircraftType[] {
  const q = query.toLowerCase().trim().replace(/\s+/g, '');
  if (q.length < 2) return [];
  const all = loadCsvRows();
  const seen = new Set<string>();
  const out: AircraftType[] = [];
  const add = (t: AircraftType) => {
    const k = t.name.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const r of all) {
    const compact = r.model.toLowerCase().replace(/\s+/g, '');
    const icaoL = r.icao.toLowerCase();
    const mfrC = r.mfr.toLowerCase().replace(/\s+/g, '');
    if (compact.includes(q) || icaoL.includes(q) || mfrC.includes(q)) {
      add(toAircraftType(r));
      if (out.length >= limit * 3) break;
    }
  }
  return out.slice(0, limit);
}

/** Merges static catalog search with full CSV model names (corporate variants). */
export function searchAircraftTypesWithCsvVariants(query: string, limit: number): AircraftType[] {
  const base = searchAircraftTypes(query, limit);
  const seen = new Set(base.map(b => b.name.toLowerCase()));
  const merged = [...base];
  for (const e of searchCsvAircraftTypeVariants(query, limit)) {
    if (merged.length >= limit) break;
    const k = e.name.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  return merged.slice(0, limit);
}

export function getCsvVariantNamesForIcao(icao: string): string[] {
  const c = icao.trim().toUpperCase();
  if (!c) return [];
  const names = new Set<string>();
  for (const r of loadCsvRows()) {
    if (r.icao === c) names.add(r.model);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
