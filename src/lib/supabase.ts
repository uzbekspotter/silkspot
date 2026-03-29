// supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://bgacgwvadpyifqeacnsb.supabase.co';
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYWNnd3ZhZHB5aWZxZWFjbnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0Nzc5MTQsImV4cCI6MjA1ODA1MzkxNH0.jyBNOBQ3RnKOSsFbKI8S0GrpRQfMfITG_rWfV0dWCqE';

export const supabase = createClient(supabaseUrl, supabaseAnon);

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password, username) {
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
