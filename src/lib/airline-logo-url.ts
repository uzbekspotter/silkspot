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
 */
export function resolveAirlineLogoSrc(args: {
  logoUrl?: string | null;
  iata: string;
  sizePx: number;
}): string {
  const w = args.sizePx;
  const raw = (args.logoUrl && args.logoUrl.trim()) || '';
  if (raw) {
    return cloudinaryFetchUrl(raw, w) ?? raw;
  }
  return aviasalesLogoUrl(args.iata, w) ?? '';
}
