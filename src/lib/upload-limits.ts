import type { SupabaseClient } from '@supabase/supabase-js';

/** Fallback if `app_settings` row is missing or unreadable (before migration 034). */
export const DAILY_PHOTO_UPLOAD_FALLBACK = 50;

export function utcCalendarDayBounds(): { startIso: string; endIso: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Max photos per user per UTC day from `app_settings` (id=1).
 * `null` = no cap. On error or missing row, returns {@link DAILY_PHOTO_UPLOAD_FALLBACK}.
 */
export async function fetchDailyPhotoUploadLimit(
  supabase: SupabaseClient,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('daily_photo_upload_limit')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.warn('[upload-limits] app_settings:', error.message);
    return DAILY_PHOTO_UPLOAD_FALLBACK;
  }
  if (!data) return DAILY_PHOTO_UPLOAD_FALLBACK;
  const v = data.daily_photo_upload_limit;
  return v == null ? null : v;
}

/** Rows in `photos` created today (UTC midnight–midnight) for this uploader. */
export async function countPhotosUploadedTodayUtc(
  supabase: SupabaseClient,
  uploaderId: string,
): Promise<number> {
  const { startIso, endIso } = utcCalendarDayBounds();
  const { count, error } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('uploader_id', uploaderId)
    .gte('created_at', startIso)
    .lt('created_at', endIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
