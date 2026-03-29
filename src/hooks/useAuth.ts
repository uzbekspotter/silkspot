import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';

interface AuthState {
  user:     User | null;
  session:  Session | null;
  profile:  UserProfile | null;
  loading:  boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null, loading: true,
  });

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) fetchProfile(session.user.id);
      else setState(s => ({ ...s, loading: false }));
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState(s => ({ ...s, session, user: session?.user ?? null }));
        if (session?.user) await fetchProfile(session.user.id);
        else setState(s => ({ ...s, profile: null, loading: false }));
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setState(s => ({ ...s, profile: data, loading: false }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, profile: null, loading: false });
  };

  return { ...state, signOut, refetchProfile: () => state.user && fetchProfile(state.user.id) };
};
