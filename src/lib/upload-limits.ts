import type { SupabaseClient } from '@supabase/supabase-js';

/** Max new photo rows per user per UTC calendar day (keep in sync with migration `033_daily_photo_upload_limit.sql`). */
export const DAILY_PHOTO_UPLOAD_LIMIT = 50;

export function utcCalendarDayBounds(): { startIso: string; endIso: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
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
