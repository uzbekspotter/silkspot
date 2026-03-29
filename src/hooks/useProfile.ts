import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';

export const useProfile = (username: string | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true); setError(null);
    supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setProfile(data);
        setLoading(false);
      });
  }, [username]);

  return { profile, loading, error };
};

export const useTopSpotters = (limit = 10) => {
  const [spotters, setSpotters] = useState<UserProfile[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('*')
      .order('approved_uploads', { ascending: false })
      .limit(limit)
      .then(({ data }) => { setSpotters(data ?? []); setLoading(false); });
  }, [limit]);

  return { spotters, loading };
};
