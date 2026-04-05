import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Missing Supabase env. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnon);

export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/`;
}

/** Email magic link: login (shouldCreateUser false) or register (true + username in user_metadata). */
export async function signInWithMagicLink(
  email: string,
  options: { isSignUp: boolean; username?: string },
) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.isSignUp,
      emailRedirectTo: getAuthRedirectUrl(),
      ...(options.isSignUp && options.username
        ? { data: { username: options.username } }
        : {}),
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  });
  if (error) throw error;
}

function oauthProviderDisabledMessage(body: { msg?: string; error_code?: string }): string {
  const msg = (body.msg ?? '').toLowerCase();
  if (
    body.error_code === 'validation_failed' ||
    msg.includes('not enabled') ||
    msg.includes('unsupported provider')
  ) {
    return (
      'Google sign-in is disabled in your Supabase project. In the Supabase Dashboard go to Authentication → ' +
      'Providers, enable Google, and add the OAuth Client ID and Client Secret from Google Cloud Console. ' +
      'Also add your site URL under Authentication → URL Configuration → Redirect URLs.'
    );
  }
  return body.msg ?? 'Could not start Google sign-in.';
}

/**
 * Uses skipBrowserRedirect so GoTrue returns JSON instead of navigating the page.
 * That way a disabled provider yields a catchable error instead of a raw JSON error page.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  const authUrl = data.url;
  if (!authUrl) throw new Error('Could not start Google sign-in.');

  let res: Response;
  try {
    res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        apikey: supabaseAnon,
        Authorization: `Bearer ${supabaseAnon}`,
      },
    });
  } catch {
    window.location.assign(authUrl);
    return;
  }

  if (res.status === 400) {
    let body: { msg?: string; error_code?: string } = {};
    try {
      body = (await res.json()) as { msg?: string; error_code?: string };
    } catch {
      /* ignore */
    }
    throw new Error(oauthProviderDisabledMessage(body));
  }

  if (!res.ok) {
    let detail = `Sign-in request failed (${res.status}).`;
    try {
      const body = (await res.json()) as { msg?: string };
      if (body.msg) detail = body.msg;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  let nextUrl: string | undefined;
  try {
    const body = (await res.json()) as { url?: string };
    nextUrl = body.url;
  } catch {
    /* ignore */
  }

  if (nextUrl) {
    window.location.assign(nextUrl);
    return;
  }

  window.location.assign(authUrl);
}

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
