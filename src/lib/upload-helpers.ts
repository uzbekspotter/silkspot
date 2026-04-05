import type { SupabaseClient } from '@supabase/supabase-js';
import { searchAirlines, searchAircraftTypes, type Airline } from '../aviation-data';
import { guessIcaoCodeFromDisplayName } from './icao-type-map';

const DEFAULT_TEMPLATE = {
  country_code: 'US' as const,
  hub_iata: null as string | null,
  alliance: null as string | null,
};

function randomIcao3(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const buf = new Uint8Array(2);
  crypto.getRandomValues(buf);
  return 'Z' + chars[buf[0]! % chars.length] + chars[buf[1]! % chars.length];
}

function pickCatalogAirline(operatorName: string): Airline | null {
  const raw = operatorName.trim();
  if (!raw) return null;
  const hits = searchAirlines(raw, 12);
  const low = raw.toLowerCase();
  const exact = hits.find(a => a.name.toLowerCase() === low);
  if (exact) return exact;
  const starts = hits.find(a => a.name.toLowerCase().startsWith(low));
  if (starts) return starts;
  return hits[0] ?? null;
}

/**
 * Find or create airlines row so Fleet can group by ICAO/IATA.
 * Order: DB name match → catalog match + DB by ICAO → insert from catalog → insert synthetic ICAO.
 */
export async function resolveOperatorId(
  supabase: SupabaseClient,
  operatorName: string | null | undefined,
): Promise<string | null> {
  const raw = operatorName?.trim();
  if (!raw) return null;

  const { data: exact } = await supabase
    .from('airlines')
    .select('id')
    .ilike('name', raw)
    .maybeSingle();
  if (exact?.id) return exact.id;

  const { data: fuzzy } = await supabase
    .from('airlines')
    .select('id')
    .ilike('name', `%${raw}%`)
    .limit(1)
    .maybeSingle();
  if (fuzzy?.id) return fuzzy.id;

  const catalog = pickCatalogAirline(raw);
  if (catalog?.icao) {
    const { data: byIcao } = await supabase
      .from('airlines')
      .select('id')
      .eq('icao', catalog.icao)
      .maybeSingle();
    if (byIcao?.id) return byIcao.id;

    const { data: inserted, error } = await supabase
      .from('airlines')
      .insert({
        name: catalog.name,
        iata: catalog.iata?.trim() || null,
        icao: catalog.icao,
        country_code: DEFAULT_TEMPLATE.country_code,
        hub_iata: DEFAULT_TEMPLATE.hub_iata,
        alliance: DEFAULT_TEMPLATE.alliance,
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (!error && inserted?.id) return inserted.id;
    if (error) console.error('resolveOperatorId insert catalog:', error);
  }

  for (let i = 0; i < 8; i++) {
    const icao = randomIcao3();
    const { data: ins, error } = await supabase
      .from('airlines')
      .insert({
        name: raw,
        icao,
        country_code: DEFAULT_TEMPLATE.country_code,
        status: 'ACTIVE',
      })
      .select('id')
      .single();
    if (!error && ins?.id) return ins.id;
    if (error && !String(error.message).toLowerCase().includes('duplicate')) {
      console.error('resolveOperatorId insert synthetic:', error);
      break;
    }
  }
  return null;
}

/**
 * Resolve aircraft_types.id from form type + manufacturer strings.
 */
export async function resolveAircraftTypeId(
  supabase: SupabaseClient,
  typeName: string | null | undefined,
  manufacturer: string | null | undefined,
): Promise<string | null> {
  const t = typeName?.trim();
  if (!t) return null;

  const tCompact = t.toUpperCase().replace(/\s+/g, '');
  if (/^(?=.*[A-Z])[A-Z0-9]{2,4}$/.test(tCompact)) {
    const { data: directIcao } = await supabase
      .from('aircraft_types')
      .select('id')
      .eq('icao_code', tCompact)
      .maybeSingle();
    if (directIcao?.id) return directIcao.id;
  }

  const byIcao = guessIcaoCodeFromDisplayName(t);
  if (byIcao) {
    const { data: row } = await supabase
      .from('aircraft_types')
      .select('id')
      .eq('icao_code', byIcao)
      .maybeSingle();
    if (row?.id) return row.id;
  }

  const { data: byName } = await supabase
    .from('aircraft_types')
    .select('id')
    .ilike('name', `%${t}%`)
    .limit(1)
    .maybeSingle();
  if (byName?.id) return byName.id;

  const cat = searchAircraftTypes(t, 1)[0];
  if (cat) {
    const { data: row2 } = await supabase
      .from('aircraft_types')
      .select('id')
      .ilike('name', cat.name)
      .limit(1)
      .maybeSingle();
    if (row2?.id) return row2.id;
  }

  const m = manufacturer?.trim();
  if (m) {
    const { data: row3 } = await supabase
      .from('aircraft_types')
      .select('id')
      .ilike('manufacturer', `%${m}%`)
      .ilike('name', `%${t}%`)
      .limit(1)
      .maybeSingle();
    if (row3?.id) return row3.id;
  }

  return null;
}

/** Resolve airports.id from IATA (3 letters) or ICAO (4 letters). */
export async function resolveAirportIdByIataOrIcao(
  supabase: SupabaseClient,
  code: string,
): Promise<string | null> {
  const raw = code.trim().toUpperCase().replace(/\s+/g, '');
  if (raw.length === 3) {
    const { data } = await supabase.from('airports').select('id').ilike('iata', raw).maybeSingle();
    return data?.id ?? null;
  }
  if (raw.length === 4) {
    const { data } = await supabase.from('airports').select('id').ilike('icao', raw).maybeSingle();
    return data?.id ?? null;
  }
  return null;
}
