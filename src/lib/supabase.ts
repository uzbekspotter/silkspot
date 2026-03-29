// ── supabase.ts ───────────────────────────────────────────────
// Supabase client — единственное место где создаётся клиент.
// Используется для: авторизация, таблицы БД, realtime.
// Хранилище фото — Cloudflare R2 (см. storage.ts)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://bgacgwvadpyifqeacnsb.supabase.co';
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYWNnd3ZhZHB5aWZxZWFjbnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDE4NzgsImV4cCI6MjA4OTcxNzg3OH0.JGvEOmO-fgUQw8mkGYWu6J4lgduhAS4mf1O_p7PHFRk';

export const supabase = createClient(supabaseUrl, supabaseAnon);

export const isSupabaseReady = !!supabase;

// ── Auth helpers ──────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// ── Photo helpers ─────────────────────────────────────────────

export interface PhotoRecord {
  registration:   string;
  airline:        string;
  aircraft_type:  string;
  msn?:           string;
  airport_iata:   string;
  shot_date:      string;
  categories:     string[];
  notes?:         string;
  storage_url:    string;
  storage_path:   string;
  file_size_kb:   number;
  width_px?:      number;
  status:         'PENDING' | 'APPROVED';
}

export async function savePhotoRecord(photo: PhotoRecord) {
  if (!supabase) {
    console.warn('[supabase] Not configured — photo record not saved');
    return null;
  }
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('photos')
    .insert({
      uploader_id:   user.id,
      storage_path:  photo.storage_path,
      webp_path:     photo.storage_url,
      shot_date:     photo.shot_date,
      notes:         photo.notes,
      status:        'PENDING',
      file_size_kb:  photo.file_size_kb,
      width_px:      photo.width_px,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedPhotos(limit = 20, offset = 0) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('photos')
    .select(`
      id, shot_date, webp_path, thumb_path, like_count, view_count,
      notes, category,
      aircraft:aircraft_id ( registration, msn, seat_config ),
      airport:airport_id ( iata, city, country_code ),
      uploader:uploader_id ( username, display_name, rank )
    `)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) { console.error(error); return []; }
  return data || [];
}
