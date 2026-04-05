// ── aircraft-lookup.ts ───────────────────────────────────────
// Unified aircraft lookup service for the Upload page.
//
// Priority chain:
//   1. In-memory cache        (successful hits only — never cache “not found” / failures)
//   2. Supabase aircraft table (our own DB)
//   3. adsbdb.com API         (fast — single call by registration)
//   4. hexdb.io API           (fallback — 2 calls: reg→hex, hex→data)
// ─────────────────────────────────────────────────────────────

import { supabase } from './lib/supabase';

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

// ── ICAO type code → full name map ───────────────────────────
const ICAO_TYPE_MAP: Record<string, string> = {
  'A388':'Airbus A380-841', 'A389':'Airbus A380-842',
  'A35K':'Airbus A350-941', 'A359':'Airbus A350-900',
  'A332':'Airbus A330-200', 'A333':'Airbus A330-300',
  'A343':'Airbus A340-300', 'A345':'Airbus A340-500',
  'A320':'Airbus A320-200', 'A321':'Airbus A321-200',
  'A319':'Airbus A319-100', 'A318':'Airbus A318-100',
  'A21N':'Airbus A321neo',  'A20N':'Airbus A320neo',
  'A19N':'Airbus A319neo',
  'B744':'Boeing 747-400',  'B748':'Boeing 747-8',
  'B77L':'Boeing 777-200LR','B77W':'Boeing 777-300ER',
  'B772':'Boeing 777-200',  'B773':'Boeing 777-300',
  'B788':'Boeing 787-8',    'B789':'Boeing 787-9',   'B78X':'Boeing 787-10',
  'B738':'Boeing 737-800',  'B739':'Boeing 737-900',
  'B38M':'Boeing 737 MAX 8','B39M':'Boeing 737 MAX 9',
  'B752':'Boeing 757-200',  'B763':'Boeing 767-300ER',
  'E190':'Embraer E190',    'E195':'Embraer E195',   'E75L':'Embraer E175',
  'AT75':'ATR 72-500',      'AT72':'ATR 72-600',
  'IL76':'Ilyushin Il-76',  'IL96':'Ilyushin Il-96',
  'T154':'Tupolev Tu-154',  'T204':'Tupolev Tu-204',
  'AN12':'Antonov An-12',   'AN24':'Antonov An-24',
  'SU95':'Sukhoi Superjet 100',
};

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
      operator:     row.operator_name ?? '',
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
      operator:     ac.registered_owner || '',
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
      operator:     ac.RegisteredOwners ?? '',
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

async function performLookup(clean: string): Promise<AircraftLookupResult | null> {
  const fromDB = await lookupFromSupabase(clean);
  if (fromDB) {
    cache.set(clean, fromDB);
    return fromDB;
  }

  const fromAdsb = await lookupFromAdsbdb(clean);
  if (fromAdsb) {
    cache.set(clean, fromAdsb);
    return fromAdsb;
  }

  const fromHex = await lookupFromHexdb(clean);
  if (fromHex) {
    cache.set(clean, fromHex);
    return fromHex;
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

// ── Batch lookup (limited concurrency — reduces external API throttling) ──
export async function lookupAircraftBatch(
  regs: string[]
): Promise<Map<string, AircraftLookupResult | null>> {
  const unique = [...new Set(regs.map(r => r.trim().toUpperCase()).filter(r => r.length >= 3))];
  const settled = await runWithConcurrency(unique, BATCH_CONCURRENCY, (r) => lookupAircraft(r));

  const map = new Map<string, AircraftLookupResult | null>();
  unique.forEach((reg, i) => map.set(reg, settled[i] ?? null));
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
