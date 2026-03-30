import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://bgacgwvadpyifqeacnsb.supabase.co';
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYWNnd3ZhZHB5aWZxZWFjbnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDE4NzgsImV4cCI6MjA4OTcxNzg3OH0.JGvEOmO-fgUQw8mkGYWu6J4lgduhAS4mf1O_p7PHFRk';

export const supabase = createClient(supabaseUrl, supabaseAnon);

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
