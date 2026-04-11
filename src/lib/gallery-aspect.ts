/** Midpoint between 4:3 and 16:9 — wider shots use a 16:9 tile, taller/narrower use 4:3. */
const ASPECT_BUCKET_MID = (4 / 3 + 16 / 9) / 2;

export type GalleryFrameClass = 'aspect-[4/3]' | 'aspect-video';

/**
 * Map pixel dimensions to one of two gallery frame shapes (4:3 or 16:9).
 * When dimensions are missing, `whenUnknown` is used (e.g. hero vs grid).
 */
export function galleryFrameClass(
  widthPx?: number | null,
  heightPx?: number | null,
  whenUnknown: GalleryFrameClass = 'aspect-[4/3]',
): GalleryFrameClass {
  const w = widthPx ?? 0;
  const h = heightPx ?? 0;
  if (w > 0 && h > 0) {
    return w / h >= ASPECT_BUCKET_MID ? 'aspect-video' : 'aspect-[4/3]';
  }
  return whenUnknown;
}
