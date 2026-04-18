/**
 * Optional Cloudinary **fetch** delivery: pulls remote images through Cloudinary
 * for sharper resizing and format negotiation (WebP/AVIF) without storing assets there.
 *
 * Set `VITE_CLOUDINARY_CLOUD_NAME` in `.env`. If unset, helpers return `undefined`
 * and callers should use the original URL.
 */
export function cloudinaryFetchUrl(remoteUrl: string, widthPx: number): string | undefined {
  const cloud = typeof import.meta.env !== 'undefined'
    ? (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)
    : undefined;
  if (!cloud?.trim() || !remoteUrl.startsWith('http')) return undefined;
  const w = Math.min(4096, Math.max(32, Math.round(widthPx)));
  const enc = encodeURIComponent(remoteUrl);
  return `https://res.cloudinary.com/${cloud.trim()}/image/fetch/f_auto,q_auto:best,w_${w}/${enc}`;
}
