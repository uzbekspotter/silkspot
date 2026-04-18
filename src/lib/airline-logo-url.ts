import { cloudinaryFetchUrl } from './cloudinary-fetch';

/** Aviasales CDN — square airline marks (valid 2-letter IATA only). */
export function aviasalesLogoUrl(iata: string, px: number): string | null {
  const t = iata.trim().toUpperCase().replace(/\0/g, '');
  if (t.length !== 2 || !/^[A-Z0-9]{2}$/.test(t)) return null;
  const n = Math.round(px * 2);
  return `https://pics.avs.io/${n}/${n}/${t}.png`;
}

/**
 * Best-effort logo URL for UI: DB `logo_url` → Cloudinary fetch (if configured) → Aviasales by IATA.
 * Never guesses Aviasales for missing/invalid IATA — a bogus code (e.g. `ZZ`) can load the wrong mark
 * while still returning HTTP 200.
 */
export function resolveAirlineLogoSrc(args: {
  logoUrl?: string | null;
  /** Two-letter IATA; if missing or invalid, Aviasales is skipped (initials / color only). */
  iata?: string | null;
  sizePx: number;
}): string {
  const w = args.sizePx;
  const raw = (args.logoUrl && args.logoUrl.trim()) || '';
  if (raw) {
    return cloudinaryFetchUrl(raw, w) ?? raw;
  }
  const t = (args.iata && String(args.iata).trim().toUpperCase()) || '';
  if (!/^[A-Z0-9]{2}$/.test(t)) return '';
  return aviasalesLogoUrl(t, w) ?? '';
}
