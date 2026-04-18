// ── aircraft-lookup.ts ───────────────────────────────────────
// Unified aircraft lookup service for the Upload page.
//
// Priority chain:
//   1. In-memory cache        (successful hits only — never cache “not found” / failures)
//   2. Supabase aircraft table (our own DB)
//   3. adsbdb.com API         (fast — single call by registration)
//   4. hexdb.io API           (fallback — 2 calls: reg→hex, hex→data)
// ─────────────────────────────────────────────────────────────

import { normalizeOperatorDisplayName } from './aviation-data';
import { supabase } from './lib/supabase';
import { ICAO_TYPE_MAP } from './lib/icao-type-map';

export interface AircraftLookupResult {
  registration: string;
  typeName:     string;
  typeIcao:     string;
  manufacturer: string;
  operator:     string;
  operatorIata: string;
  msn:          string;
  firstFlight:  string;
  seatConfig:   string;
  engines:      string;
  status:       'Active' | 'Stored' | 'Scrapped' | '';
  isVerified:   boolean;
  source:       'supabase' | 'adsbdb' | 'hexdb' | 'not_found';
}

// ── In-memory cache (successes only; avoids “stuck not found” after timeouts / rate limits)
const cache = new Map<string, AircraftLookupResult>();
/** In-flight dedupe: batch upload + debounced panel lookup must not double-hit APIs for the same reg. */
const inflight = new Map<string, Promise<AircraftLookupResult | null>>();

/** Drop cached success so the next lookup hits Supabase + external APIs again (e.g. Retry). */
export function invalidateAircraftLookupCache(reg?: string): void {
  if (reg) cache.delete(reg.trim().toUpperCase());
  else cache.clear();
}

// ICAO_TYPE_MAP imported from src/lib/icao-type-map.ts — single source of truth.

const mfrFromName = (name = ''): string => {
  const m = name.toLowerCase();
  if (m.includes('airbus'))     return 'Airbus';
  if (m.includes('boeing'))     return 'Boeing';
  if (m.includes('embraer'))    return 'Embraer';
  if (m.includes('bombardier')) return 'Bombardier';
  if (m.includes('atr'))        return 'ATR';
  if (m.includes('antonov'))    return 'Antonov';
  if (m.includes('ilyushin'))   return 'Ilyushin';
  if (m.includes('tupolev'))    return 'Tupolev';
  if (m.includes('de havilland')) return 'De Havilland';
  if (m.includes('mcdonnell'))  return 'McDonnell Douglas';
  if (m.includes('cessna'))     return 'Cessna';
  if (m.includes('beechcraft')) return 'Beechcraft';
  if (m.includes('piper'))      return 'Piper';
  if (m.includes('saab'))       return 'Saab';
  if (m.includes('fokker'))     return 'Fokker';
  if (m.includes('sukhoi'))     return 'Sukhoi';
  return name;
};

// ── Fetch with timeout ───────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── 1. Supabase lookup ───────────────────────────────────────
async function lookupFromSupabase(reg: string): Promise<AircraftLookupResult | null> {
  try {
    const { data, error } = await supabase
      .rpc('lookup_aircraft', { p_reg: reg.toUpperCase() });

    if (error || !data || data.length === 0) return null;

    const row = data[0];
    const statusMap: Record<string, AircraftLookupResult['status']> = {
      ACTIVE: 'Active', STORED: 'Stored', SCRAPPED: 'Scrapped',
      WFU: 'Stored', PRESERVED: 'Stored',
    };

    return {
      registration: row.registration ?? reg,
      typeName:     row.type_name    ?? '',
      typeIcao:     row.type_icao    ?? '',
      manufacturer: row.manufacturer ?? '',
      operator:     normalizeOperatorDisplayName(row.operator_name ?? ''),
      operatorIata: row.operator_iata ?? '',
      msn:          row.msn          ?? '',
      firstFlight:  row.first_flight ? String(row.first_flight) : '',
      seatConfig:   row.seat_config  ?? '',
      engines:      row.engines      ?? '',
      status:       statusMap[row.status] ?? '',
      isVerified:   row.is_verified  ?? false,
      source:       'supabase',
    };
  } catch {
    return null;
  }
}

// ── 2. adsbdb.com — fast single-call lookup ──────────────────
async function lookupFromAdsbdb(reg: string): Promise<AircraftLookupResult | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(reg)}`,
      8500
    );
    if (!res.ok) return null;

    const json = await res.json();
    const ac = json?.response?.aircraft;
    if (!ac) return null;

    const typeIcao = ac.type || '';
    const typeFull = ac.manufacturer && ac.type
      ? `${ac.manufacturer} ${ac.type}`.trim()
      : '';
    const typeName = ICAO_TYPE_MAP[typeIcao] || typeFull || typeIcao;

    return {
      registration: ac.registration || reg,
      typeName,
      typeIcao,
      manufacturer: mfrFromName(ac.manufacturer || typeName),
      operator:     normalizeOperatorDisplayName(ac.registered_owner || ''),
      operatorIata: ac.registered_owner_operator_flag_code || '',
      msn:          '',
      firstFlight:  '',
      seatConfig:   '',
      engines:      '',
      status:       '',
      isVerified:   false,
      source:       'adsbdb',
    };
  } catch {
    return null;
  }
}

// ── 3. hexdb.io fallback (2 calls) ──────────────────────────
async function lookupFromHexdb(reg: string): Promise<AircraftLookupResult | null> {
  try {
    const hexRes = await fetchWithTimeout(
      `https://hexdb.io/reg-hex?reg=${encodeURIComponent(reg)}`,
      6500
    );
    if (!hexRes.ok) return null;
    const hex = (await hexRes.text()).trim();
    if (!hex || hex.length !== 6) return null;

    const acRes = await fetchWithTimeout(
      `https://hexdb.io/api/v1/aircraft/${hex}`,
      6500
    );
    if (!acRes.ok) return null;
    const ac = await acRes.json();
    if (!ac?.Registration) return null;

    const typeIcao  = ac.ICAOTypeCode ?? '';
    const typeName  = ICAO_TYPE_MAP[typeIcao]
      ?? `${ac.Manufacturer ?? ''} ${ac.Type ?? ''}`.trim();

    return {
      registration: ac.Registration,
      typeName,
      typeIcao,
      manufacturer: mfrFromName(ac.Manufacturer),
      operator:     normalizeOperatorDisplayName(ac.RegisteredOwners ?? ''),
      operatorIata: ac.OperatorFlagCode ?? '',
      msn:          '',
      firstFlight:  '',
      seatConfig:   '',
      engines:      '',
      status:       '',
      isVerified:   false,
      source:       'hexdb',
    };
  } catch {
    return null;
  }
}

/** Supabase row is worth using as the final answer (not a stub with only MSN / empty type+operator). */
function isUsefulAircraftRow(row: AircraftLookupResult): boolean {
  return !!(
    row.typeName?.trim() ||
    row.typeIcao?.trim() ||
    row.operator?.trim()
  );
}

/** Keep MSN / optional fields from our DB when external APIs omit them. */
function mergeDbIntoExternal(
  db: AircraftLookupResult | null,
  ext: AircraftLookupResult,
): AircraftLookupResult {
  if (!db) return ext;
  return {
    ...ext,
    msn: ext.msn?.trim() || db.msn?.trim() || '',
    firstFlight: ext.firstFlight?.trim() || db.firstFlight?.trim() || '',
    seatConfig: ext.seatConfig?.trim() || db.seatConfig?.trim() || '',
    engines: ext.engines?.trim() || db.engines?.trim() || '',
    status: ext.status || db.status || '',
    isVerified: ext.isVerified || db.isVerified,
  };
}

async function performLookup(clean: string): Promise<AircraftLookupResult | null> {
  const fromDB = await lookupFromSupabase(clean);
  if (fromDB && isUsefulAircraftRow(fromDB)) {
    cache.set(clean, fromDB);
    return fromDB;
  }

  const fromAdsb = await lookupFromAdsbdb(clean);
  if (fromAdsb) {
    const merged = mergeDbIntoExternal(fromDB, fromAdsb);
    cache.set(clean, merged);
    return merged;
  }

  const fromHex = await lookupFromHexdb(clean);
  if (fromHex) {
    const merged = mergeDbIntoExternal(fromDB, fromHex);
    cache.set(clean, merged);
    return merged;
  }

  if (fromDB) {
    cache.set(clean, fromDB);
    return fromDB;
  }

  return null;
}

// ── Main export ──────────────────────────────────────────────
export async function lookupAircraft(
  reg: string
): Promise<AircraftLookupResult | null> {
  const clean = reg.trim().toUpperCase();
  if (clean.length < 3) return null;

  const hit = cache.get(clean);
  if (hit) return hit;

  const pending = inflight.get(clean);
  if (pending) return pending;

  const p = performLookup(clean).finally(() => inflight.delete(clean));
  inflight.set(clean, p);
  return p;
}

const BATCH_CONCURRENCY = 5;

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  };
  const n = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/** Match Upload/Fleet reg keys (trim, upper, strip spaces — hyphens stay). */
function regKeyVariants(reg: string): { plain: string; norm: string } {
  const plain = reg.trim().toUpperCase();
  const norm = plain.replace(/\s+/g, '');
  return { plain, norm };
}

// ── Batch lookup (limited concurrency — reduces external API throttling) ──
export async function lookupAircraftBatch(
  regs: string[]
): Promise<Map<string, AircraftLookupResult | null>> {
  const unique = [...new Set(regs.map(r => r.trim().toUpperCase()).filter(r => r.length >= 3))];
  const settled = await runWithConcurrency(unique, BATCH_CONCURRENCY, (r) => lookupAircraft(r));

  const map = new Map<string, AircraftLookupResult | null>();
  unique.forEach((reg, i) => {
    const res = settled[i] ?? null;
    const { plain, norm } = regKeyVariants(reg);
    map.set(plain, res);
    map.set(norm, res);
  });
  return map;
}

// ── Save new / updated aircraft data back to Supabase ────────
export async function contributeAircraftData(data: {
  registration: string;
  typeIcao?:    string;
  operatorIata?: string;
  msn?:         string;
  firstFlight?: string;
  seatConfig?:  string;
  engines?:     string;
  status?:      string;
}): Promise<void> {
  try {
    await supabase.rpc('contribute_aircraft_data', {
      p_registration: data.registration.toUpperCase(),
      p_msn:          data.msn         || null,
      p_first_flight: data.firstFlight || null,
      p_seat_config:  data.seatConfig  || null,
      p_engines:      data.engines     || null,
      p_status:       data.status?.toUpperCase() || null,
    });
  } catch {
    // Silent fail — contribution is best-effort
  }
}
