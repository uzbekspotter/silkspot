import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AircraftWithRelations } from '../lib/database.types';

export const useAircraft = (registration: string | null) => {
  const [aircraft, setAircraft] = useState<AircraftWithRelations | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!registration) return;
    setLoading(true); setError(null);
    supabase
      .from('aircraft')
      .select(`*, aircraft_types(name, icao_code, manufacturer, engine_designator)`)
      .eq('registration', registration)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setAircraft(data as AircraftWithRelations);
        setLoading(false);
      });
  }, [registration]);

  return { aircraft, loading, error };
};

export const useAircraftSearch = (query: string) => {
  const [results,  setResults]  = useState<AircraftWithRelations[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('aircraft')
        .select(`*, aircraft_types(name, icao_code)`)
        .ilike('registration', `${query}%`)
        .limit(8);
      setResults((data ?? []) as AircraftWithRelations[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
};
