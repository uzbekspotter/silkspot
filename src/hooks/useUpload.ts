import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadPhoto } from '../lib/storage';
import type { PhotoStatus } from '../lib/database.types';

interface UploadFormData {
  registration:  string;
  aircraftType:  string;
  msn:           string;
  manufacturer:  string;
  operator:      string;
  airport:       string;
  shotDate:      string;
  yearBuilt:     string;
  livery:        string;
  category:      string;
  notes:         string;
  gpsLat:        string;
  gpsLng:        string;
}

interface UploadState {
  status:   'idle' | 'uploading' | 'submitting' | 'success' | 'error';
  progress: number;
  error:    string | null;
  photoId:  string | null;
}

export const useUpload = (userId: string | null) => {
  const [state, setState] = useState<UploadState>({
    status: 'idle', progress: 0, error: null, photoId: null,
  });

  const submit = async (file: File, form: UploadFormData): Promise<boolean> => {
    if (!userId) { setState(s => ({ ...s, error: 'Not authenticated' })); return false; }

    setState({ status: 'uploading', progress: 10, error: null, photoId: null });

    let uploaded;
    try {
      uploaded = await uploadPhoto(file, form.registration, (pct) => {
        setState(s => ({ ...s, progress: 10 + Math.round(pct * 0.3) }));
      });
    } catch {
      setState(s => ({ ...s, status: 'error', error: 'File upload failed' }));
      return false;
    }
    setState(s => ({ ...s, progress: 40, status: 'submitting' }));

    // 2. Resolve aircraft ID (find or create)
    let { data: aircraft } = await supabase
      .from('aircraft')
      .select('id')
      .eq('registration', form.registration.toUpperCase())
      .single();

    if (!aircraft) {
      const { data: newAc } = await supabase
        .from('aircraft')
        .insert({ registration: form.registration.toUpperCase(), created_by: userId })
        .select('id')
        .single();
      aircraft = newAc;
    }
    if (!aircraft) {
      setState(s => ({ ...s, status: 'error', error: 'Could not resolve aircraft' }));
      return false;
    }
    setState(s => ({ ...s, progress: 65 }));

    // 3. Resolve airport ID
    let airportId: string | null = null;
    if (form.airport) {
      const { data: ap } = await supabase
        .from('airports')
        .select('id')
        .ilike('iata', form.airport)
        .single();
      airportId = ap?.id ?? null;
    }

    // 4. Resolve operator ID
    let operatorId: string | null = null;
    if (form.operator) {
      const { data: op } = await supabase
        .from('airlines')
        .select('id')
        .ilike('name', `%${form.operator}%`)
        .single();
      operatorId = op?.id ?? null;
    }
    setState(s => ({ ...s, progress: 80 }));

    // 5. Insert photo record
    const { data: photo, error: insertError } = await supabase
      .from('photos')
      .insert({
        aircraft_id:  aircraft.id,
        uploader_id:  userId,
        operator_id:  operatorId,
        airport_id:   airportId,
        shot_date:    form.shotDate,
        shot_lat:     form.gpsLat ? parseFloat(form.gpsLat) : null,
        shot_lng:     form.gpsLng ? parseFloat(form.gpsLng) : null,
        category:     form.category.toUpperCase().replace(/-/g,'_') as any,
        livery_notes: form.livery || null,
        notes:        form.notes || null,
        storage_path: uploaded.path,
        status:       'PENDING' as PhotoStatus,
      })
      .select('id')
      .single();

    if (insertError) {
      setState(s => ({ ...s, status: 'error', error: insertError.message }));
      return false;
    }

    setState({ status: 'success', progress: 100, error: null, photoId: photo.id });
    return true;
  };

  const reset = () => setState({ status: 'idle', progress: 0, error: null, photoId: null });

  return { ...state, submit, reset };
};
