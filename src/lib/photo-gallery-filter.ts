/**
 * Profile / Explore "Airport" filter: true airport-scene categories, or any row with
 * no aircraft registration but an airport (e.g. legacy uploads without AIRPORT_* enum).
 */
export function isAirportGalleryEntry(p: {
  category?: string | null;
  aircraft?: { registration?: string | null } | null | unknown;
  airport?: { iata?: string | null } | null | unknown;
}): boolean {
  const cat = String(p.category || '');
  if (cat.startsWith('AIRPORT_')) return true;
  const reg = (p.aircraft as { registration?: string } | null)?.registration?.trim();
  if (reg) return false;
  const iata = (p.airport as { iata?: string } | null)?.iata?.trim();
  return !!iata;
}
