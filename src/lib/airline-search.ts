import type { SupabaseClient } from '@supabase/supabase-js';
import { searchAirlines, type Airline } from '../aviation-data';

const MAX_ILIKE_LEN = 80;

/** Strip LIKE wildcards from user input (avoid breaking `.ilike` pattern). */
function sanitizeIlikeFragment(s: string): string {
  return s.replace(/[%_\\]/g, '').trim().slice(0, MAX_ILIKE_LEN);
}

function rowToAirline(r: { name: string; iata: string | null; icao: string | null }): Airline {
  return {
    name: (r.name || '').trim(),
    iata: (r.iata || '').trim().slice(0, 2),
    icao: (r.icao || '').trim().slice(0, 3),
  };
}

/**
 * Airline autocomplete: in-app catalog (`aviation-data`) **plus** rows from `public.airlines`
 * so operators seeded or inserted in the DB always appear, not only the static ~300 list.
 */
export async function searchAirlinesMerged(
  supabase: SupabaseClient,
  query: string,
  limit = 12,
): Promise<Airline[]> {
  const qRaw = query.trim();
  if (!qRaw) return [];

  const local = searchAirlines(qRaw, Math.min(limit, 10));
  const qSafe = sanitizeIlikeFragment(qRaw);
  const upper = qRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const dbByKey = new Map<string, Airline>();

  const addDbRows = (rows: { name: string; iata: string | null; icao: string | null }[] | null) => {
    for (const r of rows || []) {
      const a = rowToAirline(r);
      if (!a.name) continue;
      const key = `${a.name.toLowerCase()}|${(a.icao || a.iata || '').toLowerCase()}`;
      if (!dbByKey.has(key)) dbByKey.set(key, a);
    }
  };

  try {
    if (qSafe.length >= 2) {
      const { data, error } = await supabase
        .from('airlines')
        .select('name, iata, icao')
        .ilike('name', `%${qSafe}%`)
        .order('name')
        .limit(limit);
      if (!error) addDbRows(data);
    }

    if (dbByKey.size < limit && /^[A-Z]{2}$/.test(upper)) {
      const { data, error } = await supabase
        .from('airlines')
        .select('name, iata, icao')
        .eq('iata', upper)
        .limit(8);
      if (!error) addDbRows(data);
    }

    if (dbByKey.size < limit && /^[A-Z]{3}$/.test(upper)) {
      const { data, error } = await supabase
        .from('airlines')
        .select('name, iata, icao')
        .eq('icao', upper)
        .limit(8);
      if (!error) addDbRows(data);
    }
  } catch {
    /* offline / blocked — return catalog only */
  }

  const fromDb = [...dbByKey.values()];
  const seenName = new Set<string>();
  const out: Airline[] = [];

  for (const a of local) {
    const k = a.name.toLowerCase();
    if (seenName.has(k)) continue;
    seenName.add(k);
    out.push(a);
  }
  for (const a of fromDb) {
    const k = a.name.toLowerCase();
    if (seenName.has(k)) continue;
    seenName.add(k);
    out.push(a);
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}
