// ── aircraft-lookup.ts ───────────────────────────────────────
// Unified aircraft lookup service for the Upload page.
//
// Priority chain:
//   1. Supabase aircraft table  (our own DB — most complete)
//   2. hexdb.io API             (fallback — gives type + operator)
//
// When Supabase is not yet configured the service falls back to
// hexdb automatically, so the Upload page always works.
// ─────────────────────────────────────────────────────────────

// Result shape — matches fields on the Upload form
export interface AircraftLookupResult {
  registration: string;
  typeName:     string;     // e.g. "Airbus A380-841"
  typeIcao:     string;     // e.g. "A388"
  manufacturer: string;     // e.g. "Airbus"
  operator:     string;     // e.g. "Emirates Airline"
  operatorIata: string;     // e.g. "EK"
  msn:          string;     // e.g. "234"
  firstFlight:  string;     // YYYY-MM-DD or ""
  seatConfig:   string;     // e.g. "F14 J76 Y427"
  engines:      string;     // e.g. "4× Rolls-Royce Trent 970"
  status:       'Active' | 'Stored' | 'Scrapped' | '';
  isVerified:   boolean;    // true = data confirmed by moderator
  source:       'supabase' | 'hexdb' | 'not_found';
}

// ── ICAO type code → full name map (hexdb returns short codes) ──
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

const mfrFromName = (mfr = ''): string => {
  const m = mfr.toLowerCase();
  if (m.includes('airbus'))     return 'Airbus';
  if (m.includes('boeing'))     return 'Boeing';
  if (m.includes('embraer'))    return 'Embraer';
  if (m.includes('bombardier')) return 'Bombardier';
  if (m.includes('atr'))        return 'ATR';
  if (m.includes('antonov'))    return 'Antonov';
  if (m.includes('ilyushin'))   return 'Ilyushin';
  if (m.includes('tupolev'))    return 'Tupolev';
  return mfr;
};

// ── 1. Supabase lookup ────────────────────────────────────────
// Calls our own DB via the lookup_aircraft() Postgres function.
// Returns null if Supabase is not configured or record not found.
async function lookupFromSupabase(
  reg: string
): Promise<AircraftLookupResult | null> {
  try {
    // Import lazily so the file still compiles without supabase-js
    const { createClient } = await import('@supabase/supabase-js');
    const url  = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;

    const supabase = createClient(url, anon);

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

// ── 2. hexdb.io fallback ──────────────────────────────────────
// Free, no API key. Returns type + operator but no MSN/config/engines.
async function lookupFromHexdb(
  reg: string
): Promise<AircraftLookupResult | null> {
  try {
    const hexRes = await fetch(
      `https://hexdb.io/reg-hex?reg=${encodeURIComponent(reg)}`
    );
    if (!hexRes.ok) return null;
    const hex = (await hexRes.text()).trim();
    if (!hex || hex.length !== 6) return null;

    const acRes = await fetch(`https://hexdb.io/api/v1/aircraft/${hex}`);
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

// ── Main export ───────────────────────────────────────────────
// Tries Supabase first, falls back to hexdb.
// Returns null if both fail (not found anywhere).
export async function lookupAircraft(
  reg: string
): Promise<AircraftLookupResult | null> {
  const clean = reg.trim().toUpperCase();
  if (clean.length < 3) return null;

  // 1. Try our DB
  const fromDB = await lookupFromSupabase(clean);
  if (fromDB) return fromDB;

  // 2. Fall back to hexdb
  const fromHex = await lookupFromHexdb(clean);
  return fromHex; // null if truly not found
}

// ── Save new / updated aircraft data back to Supabase ─────────
// Called when user submits a photo with extra details.
// Only runs if Supabase is configured.
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
    const { createClient } = await import('@supabase/supabase-js');
    const url  = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    const supabase = createClient(url, anon);

    // Upsert the aircraft record — only fill in missing fields
    // (don't overwrite verified data with user input)
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
