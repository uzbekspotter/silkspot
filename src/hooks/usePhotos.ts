import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { PhotoWithRelations } from '../lib/database.types';

interface UsePhotosOptions {
  limit?:      number;
  aircraftId?: string;
  uploaderId?: string;
  airportId?:  string;
  featured?:   boolean;
  orderBy?:    'created_at' | 'like_count' | 'view_count';
}

export const usePhotos = (opts: UsePhotosOptions = {}) => {
  const [photos,  setPhotos]  = useState<PhotoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const { limit = 20, aircraftId, uploaderId, airportId, featured, orderBy = 'created_at' } = opts;

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    let query = supabase
      .from('photos')
      .select(`
        *,
        aircraft(*, aircraft_types(name, icao_code)),
        uploader:user_profiles!uploader_id(id, username, display_name, avatar_url, rank),
        operator:airlines(id, iata, name, logo_url),
        airport:airports(id, iata, icao, name, city)
      `)
      .eq('status', 'APPROVED')
      .order(orderBy, { ascending: false })
      .limit(limit);

    if (aircraftId) query = query.eq('aircraft_id', aircraftId);
    if (uploaderId) query = query.eq('uploader_id', uploaderId);
    if (airportId)  query = query.eq('airport_id', airportId);
    if (featured)   query = query.eq('is_featured', true);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setPhotos((data ?? []) as PhotoWithRelations[]);
    setLoading(false);
  }, [limit, aircraftId, uploaderId, airportId, featured, orderBy]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleLike = async (photoId: string, userId: string) => {
    const existing = await supabase
      .from('photo_likes')
      .select('photo_id')
      .eq('photo_id', photoId)
      .eq('user_id', userId)
      .single();

    if (existing.data) {
      await supabase.from('photo_likes').delete()
        .eq('photo_id', photoId).eq('user_id', userId);
      setPhotos(p => p.map(ph => ph.id === photoId
        ? { ...ph, like_count: ph.like_count - 1 } : ph));
    } else {
      await supabase.from('photo_likes').insert({ photo_id: photoId, user_id: userId });
      setPhotos(p => p.map(ph => ph.id === photoId
        ? { ...ph, like_count: ph.like_count + 1 } : ph));
    }
  };

  return { photos, loading, error, refetch: fetch, toggleLike };
};
