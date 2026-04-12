import type { CSSProperties } from 'react';

/** Midpoint between 3:2 (typical camera stills) and 16:9 — wider shots use 16:9, else 3:2. */
const ASPECT_BUCKET_MID = (3 / 2 + 16 / 9) / 2;

export type GalleryFrameClass = 'aspect-[3/2]' | 'aspect-video';

/**
 * Exact CSS aspect-ratio when pixel dimensions exist (avoids letterboxing from 4:3 vs 16:9 buckets).
 */
export function photoAspectRatioStyle(
  widthPx?: number | null,
  heightPx?: number | null,
): Pick<CSSProperties, 'aspectRatio'> | undefined {
  const w = Number(widthPx) || 0;
  const h = Number(heightPx) || 0;
  if (w > 0 && h > 0) return { aspectRatio: `${w} / ${h}` };
  return undefined;
}

/**
 * Map pixel dimensions to one of two gallery frame shapes (4:3 or 16:9).
 * When dimensions are missing, `whenUnknown` is used (e.g. hero vs grid).
 */
export function galleryFrameClass(
  widthPx?: number | null,
  heightPx?: number | null,
  whenUnknown: GalleryFrameClass = 'aspect-[3/2]',
): GalleryFrameClass {
  const w = widthPx ?? 0;
  const h = heightPx ?? 0;
  if (w > 0 && h > 0) {
    return w / h >= ASPECT_BUCKET_MID ? 'aspect-video' : 'aspect-[3/2]';
  }
  return whenUnknown;
}
