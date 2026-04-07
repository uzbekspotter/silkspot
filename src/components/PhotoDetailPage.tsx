import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Eye, Camera, MapPin, Calendar, Plane, User,
  ChevronLeft, ChevronRight, X, Maximize2, Download, Share2,
  CheckCircle2, Clock, Loader2, AlertCircle, Pencil,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { searchAirports, type Airport } from '../airports';
import { proxyImageUrl } from '../lib/storage';
import { Page } from '../types';
import { PhotoStarRating, PhotoStarDisplay } from './PhotoStarRating';

interface PhotoDetailPageProps {
  photoId: string | null;
  onBack: () => void;
  onPhotoClick: (id: string) => void;
  onOpenAircraft: (registration: string) => void;
  onNavigate: (page: Page) => void;
  onOpenMapAirport: (iata: string) => void;
}

interface PhotoData {
  id: string;
  storage_path: string;
  shot_date: string | null;
  category: string | null;
  like_count: number;
  view_count: number;
  rating_sum: number;
  rating_count: number;
  is_featured: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  aircraft: { registration: string; type_name?: string } | null;
  operator: { name: string; iata?: string } | null;
  airport: { iata: string; name?: string; city?: string } | null;
  uploader: { id: string; username: string; display_name: string | null; rank: string | null; approved_uploads: number } | null;
}

interface RelatedPhoto {
  id: string;
  storage_path: string;
  like_count: number;
  view_count: number;
  rating_sum?: number;
  rating_count?: number;
  aircraft: { registration: string } | null;
  operator: { name: string } | null;
}

/** Supabase/PostgREST errors are plain objects, not always `instanceof Error`. */
function formatClientError(e: unknown): string {
  if (e instanceof Error) return e.message || 'Something went wrong';
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    const details = o.details;
    if (typeof details === 'string' && details.trim()) return details;
    const hint = o.hint;
    if (typeof hint === 'string' && hint.trim()) return hint;
  }
  return 'Could not save changes';
}

const PHOTO_CATEGORY_EDIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'TAKEOFF', label: 'Takeoff' },
  { value: 'LANDING', label: 'Landing' },
  { value: 'STATIC', label: 'Static' },
  { value: 'COCKPIT', label: 'Cockpit' },
  { value: 'AIR_TO_AIR', label: 'Air to air' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'SPECIAL_LIVERY', label: 'Special livery' },
  { value: 'SCRAPPED_SHOT', label: 'Scrapped' },
  { value: 'OTHER', label: 'Other' },
];

export const PhotoDetailPage = ({ photoId, onBack, onPhotoClick, onOpenAircraft, onNavigate, onOpenMapAirport }: PhotoDetailPageProps) => {
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedPhotos, setRelatedPhotos] = useState<RelatedPhoto[]>([]);
  const [lightbox, setLightbox] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editShotOpen, setEditShotOpen] = useState(false);
  const [airportForm, setAirportForm] = useState('');
  const [shotDateForm, setShotDateForm] = useState('');
  const [categoryForm, setCategoryForm] = useState('OTHER');
  const [airSuggestions, setAirSuggestions] = useState<Airport[]>([]);
  const [shotMetaSaving, setShotMetaSaving] = useState(false);
  const [shotMetaError, setShotMetaError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(u => setCurrentUserId(u?.id ?? null)).catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    const q = airportForm.trim();
    if (q.length < 2) {
      setAirSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => setAirSuggestions(searchAirports(q, 8)), 200);
    return () => window.clearTimeout(t);
  }, [airportForm]);

  useEffect(() => {
    if (photoId) loadPhoto(photoId);
  }, [photoId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightbox) setLightbox(false);
      if (e.key === 'Escape' && !lightbox) onBack();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, onBack]);

  const loadPhoto = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('photos')
        .select(`
          id, aircraft_id, airport_id, storage_path, shot_date, category, like_count, view_count, rating_sum, rating_count, is_featured, status, notes, created_at,
          aircraft(registration, aircraft_types(name, manufacturer)),
          operator:airlines(name, iata),
          airport:airports(iata, name, city),
          uploader:user_profiles!uploader_id(id, username, display_name, rank, approved_uploads, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Photo not found');

      setPhoto(data as any);

      try { await supabase.rpc('increment_view_count', { photo_id: id }); } catch {};

      const row = data as { aircraft_id?: string | null; airport_id?: string | null };
      let relQ = supabase
        .from('photos')
        .select(
          'id, storage_path, like_count, view_count, rating_sum, rating_count, aircraft(registration), operator:airlines(name)',
        )
        .neq('id', id)
        .eq('status', 'APPROVED');
      if (row.aircraft_id) {
        relQ = relQ.eq('aircraft_id', row.aircraft_id);
      } else if (row.airport_id) {
        relQ = relQ.eq('airport_id', row.airport_id);
      }
      const { data: related } = await relQ.order('created_at', { ascending: false }).limit(6);
      setRelatedPhotos((related as any[]) ?? []);
    } catch (err: any) {
      console.error('Error loading photo:', err);
      setError(err?.message || 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = useCallback(async () => {
    const url = window.location.origin + '/?photo=' + photoId;
    if (navigator.share) {
      try { await navigator.share({ title: 'SILKSPOT Photo', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }, [photoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10" style={{ background: 'transparent' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#94a3b8' }} />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Loading photo...</p>
        </div>
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10" style={{ background: 'transparent' }}>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#dc2626' }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: '#0f172a' }}>Photo not found</h2>
          <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>{error || 'This photo may have been removed.'}</p>
          <button onClick={onBack} className="btn-primary" style={{ height: 40, padding: '0 24px', fontSize: 13 }}>
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    );
  }

  const reg = (photo.aircraft as any)?.registration || '?';
  const typeName = (photo.aircraft as any)?.aircraft_types?.name || '';
  const manufacturer = (photo.aircraft as any)?.aircraft_types?.manufacturer || '';
  const airlineName = (photo.operator as any)?.name || '';
  const airlineIata = (photo.operator as any)?.iata || '';
  const airportIata = (photo.airport as any)?.iata || '';
  const airportName = (photo.airport as any)?.name || '';
  const isAirportScene = String(photo.category || '').startsWith('AIRPORT_');
  const headlineTitle = isAirportScene
    ? [airportIata, airportName].filter(Boolean).join(' · ') || 'Airport'
    : reg;
  const airportCity = (photo.airport as any)?.city || '';
  const uploaderName = (photo.uploader as any)?.display_name || (photo.uploader as any)?.username || 'Unknown';
  const uploaderUsername = (photo.uploader as any)?.username || '';
  const uploaderRank = (photo.uploader as any)?.rank || 'Observer';
  const uploaderPhotos = (photo.uploader as any)?.approved_uploads || 0;
  const uploaderAvatar = (photo.uploader as any)?.avatar_url || '';
  const imgUrl = proxyImageUrl(photo.storage_path || '');
  const shotDate = photo.shot_date ? new Date(photo.shot_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const uploadedDate = new Date(photo.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const category = photo.category ? photo.category.charAt(0) + photo.category.slice(1).toLowerCase().replace(/_/g, ' ') : '';
  const canOpenAircraft = !isAirportScene && !!reg && reg !== '?';
  const canOpenAirport = !!airportIata;
  const uploaderId = (photo.uploader as { id?: string } | null)?.id;
  /** Same rule as RPC `update_my_photo_shot_details`: only the uploader sees this UI; others get no form and RPC rejects anyway. */
  const isPhotoOwner =
    !!currentUserId &&
    !!uploaderId &&
    String(currentUserId).toLowerCase() === String(uploaderId).toLowerCase();
  const canEditShotMeta =
    isPhotoOwner && ['PENDING', 'APPROVED', 'REJECTED'].includes(photo.status);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      {/* Back bar */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-3 flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="btn-outline" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <section className="relative" style={{ background: 'transparent' }}>
        <div className="site-w">
          <div className="relative cursor-pointer group" onClick={() => setLightbox(true)}>
            <img
              src={imgUrl}
              alt={headlineTitle}
              className="w-full object-contain"
              style={{ maxHeight: '70vh', minHeight: 300, background: '#f8fafc' }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff' }}>
                <Maximize2 className="w-4 h-4" />
                <span className="text-sm font-medium">View full size</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="site-w py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main column */}
          <div className="lg:col-span-8 space-y-6">

            {/* Title row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {canOpenAircraft ? (
                    <button
                      onClick={() => onOpenAircraft(reg)}
                      className="font-headline text-4xl font-bold tracking-tight"
                      style={{
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {headlineTitle}
                    </button>
                  ) : (
                    <span
                      className="font-headline text-4xl font-bold tracking-tight"
                      style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
                    >
                      {headlineTitle}
                    </span>
                  )}
                  {photo.status === 'PENDING' && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>Pending review</span>}
                  {photo.status === 'APPROVED' && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>Approved</span>}
                  {photo.is_featured && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Featured</span>}
                </div>
                {!isAirportScene && typeName && (
                  <button
                    onClick={() => canOpenAircraft && onOpenAircraft(reg)}
                    className="text-lg"
                    style={{
                      color: '#475569',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: canOpenAircraft ? 'pointer' : 'default',
                      textAlign: 'left',
                    }}>
                    {typeName}
                  </button>
                )}
                {isAirportScene && category && (
                  <p className="text-lg" style={{ color: '#475569' }}>
                    {category}
                  </p>
                )}
                {!isAirportScene && airlineName && (
                  <button
                    onClick={() => onNavigate('fleet')}
                    className="text-sm mt-1"
                    style={{
                      color: '#94a3b8',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                    {airlineName}
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: '#475569', fontFamily: '"SF Mono",monospace' }}>
                  <Eye className="w-4 h-4" style={{ color: '#94a3b8' }} />{(photo.view_count || 0).toLocaleString()}
                </span>
                <PhotoStarRating
                  photoId={photo.id}
                  ratingSum={photo.rating_sum ?? 0}
                  ratingCount={photo.rating_count ?? 0}
                  onAggregatesChange={(sum, cnt) => setPhoto(p => (p ? { ...p, rating_sum: sum, rating_count: cnt } : p))}
                />
              </div>
            </div>

            {/* Compact info grid */}
            <div className="card overflow-hidden" style={{ borderColor: '#64748b' }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: '#f1f5f9' }}>
                {[
                  ...(!isAirportScene
                    ? [
                        { icon: Plane, label: 'Registration', value: reg, mono: true, accent: true, clickable: canOpenAircraft, onClick: () => canOpenAircraft && onOpenAircraft(reg) },
                      ]
                    : []),
                  ...(!isAirportScene && typeName
                    ? [{ icon: Plane, label: 'Type', value: manufacturer ? `${manufacturer} ${typeName}` : typeName, mono: false, accent: false, clickable: canOpenAircraft, onClick: () => canOpenAircraft && onOpenAircraft(reg) }]
                    : []),
                  ...(!isAirportScene
                    ? [
                        {
                          icon: Camera,
                          label: 'Airline',
                          value: airlineName ? `${airlineName}${airlineIata ? ` (${airlineIata})` : ''}` : 'Not linked',
                          mono: false,
                          accent: false,
                          clickable: true,
                          onClick: () => onNavigate('fleet'),
                        },
                      ]
                    : []),
                  { icon: MapPin, label: 'Airport', value: airportIata ? `${airportIata}${airportName ? ` — ${airportName}` : ''}${airportCity ? `, ${airportCity}` : ''}` : 'Not linked', mono: false, accent: false, clickable: canOpenAirport, onClick: () => canOpenAirport && onOpenMapAirport(airportIata) },
                  ...(category ? [{ icon: Camera, label: 'Category', value: category, mono: false, accent: false, clickable: false, onClick: undefined }] : []),
                  ...(shotDate ? [{ icon: Calendar, label: 'Taken', value: shotDate, mono: false, accent: false, clickable: false, onClick: undefined }] : []),
                  { icon: Clock, label: 'Uploaded', value: uploadedDate, mono: false, accent: false, clickable: false, onClick: undefined },
                ].map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.label + i}
                      onClick={row.onClick}
                      className="flex items-center gap-2.5 px-4 py-3 text-left"
                      style={{
                        background: '#fff',
                        border: 'none',
                        width: '100%',
                        cursor: row.clickable ? 'pointer' : 'default',
                      }}>
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: '#cbd5e1' }} />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#94a3b8', letterSpacing: '0.06em' }}>{row.label}</div>
                        <div className="text-sm font-medium truncate" style={{
                          color: row.accent ? '#0ea5e9' : '#0f172a',
                          fontFamily: row.mono ? '"SF Mono",monospace' : undefined,
                        }}>{row.value}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {canEditShotMeta && (
              <div className="card overflow-hidden" style={{ borderColor: '#64748b' }}>
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: '#f1f5f9', background: '#fafbfc' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Pencil className="w-3.5 h-3.5 shrink-0" style={{ color: '#94a3b8' }} />
                    <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                      Correct shot details
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium shrink-0"
                    style={{ color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      if (editShotOpen) {
                        setEditShotOpen(false);
                        setShotMetaError(null);
                      } else {
                        setShotMetaError(null);
                        setAirportForm(airportIata || '');
                        setShotDateForm(photo.shot_date ? String(photo.shot_date).slice(0, 10) : '');
                        setCategoryForm(photo.category || 'OTHER');
                        setEditShotOpen(true);
                      }
                    }}
                  >
                    {editShotOpen ? 'Close' : 'Edit'}
                  </button>
                </div>
                {editShotOpen && (
                  <div className="px-4 py-4 space-y-4">
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                      Update airport (IATA or ICAO from the database), the date the photo was taken, or category. Leave airport empty to unset. Codes must exist in SILKSPOT airports.
                    </p>
                    <div className="relative">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                        Airport code
                      </label>
                      <input
                        type="text"
                        value={airportForm}
                        onChange={e => setAirportForm(e.target.value.toUpperCase())}
                        placeholder="e.g. PKX or ULLI"
                        className="w-full rounded-lg border px-3 py-2 text-sm font-mono"
                        style={{ borderColor: '#e2e8f0', background: '#fff', color: '#0f172a' }}
                        autoComplete="off"
                      />
                      {airSuggestions.length > 0 && (
                        <ul
                          className="absolute z-20 mt-1 w-full max-h-40 overflow-auto rounded-lg border bg-white shadow-lg py-1 text-left"
                          style={{ borderColor: '#e2e8f0' }}
                        >
                          {airSuggestions.map(a => (
                            <li key={a.iata}>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                                style={{ color: '#0f172a' }}
                                onClick={() => {
                                  setAirportForm(a.iata);
                                  setAirSuggestions([]);
                                }}
                              >
                                <span className="font-mono font-semibold">{a.iata}</span>
                                <span className="text-slate-500"> — {a.name}, {a.city}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                        Shot date <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={shotDateForm}
                        onChange={e => setShotDateForm(e.target.value)}
                        required
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: '#e2e8f0', background: '#fff', color: '#0f172a' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8' }}>
                        Category
                      </label>
                      <select
                        value={categoryForm}
                        onChange={e => setCategoryForm(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: '#e2e8f0', background: '#fff', color: '#0f172a' }}
                      >
                        {PHOTO_CATEGORY_EDIT_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {shotMetaError && (
                      <p className="text-xs" style={{ color: '#dc2626' }}>
                        {shotMetaError}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                        disabled={shotMetaSaving}
                        onClick={async () => {
                          if (!shotDateForm.trim()) {
                            setShotMetaError('Shot date is required.');
                            return;
                          }
                          setShotMetaSaving(true);
                          setShotMetaError(null);
                          try {
                            const { error } = await supabase.rpc('update_my_photo_shot_details', {
                              p_photo_id: photo.id,
                              p_airport_iata: airportForm.trim() ? airportForm.trim() : null,
                              p_shot_date: shotDateForm,
                              p_category: categoryForm || null,
                            });
                            if (error) throw error;
                            setEditShotOpen(false);
                            await loadPhoto(photo.id);
                          } catch (e: unknown) {
                            setShotMetaError(formatClientError(e));
                          } finally {
                            setShotMetaSaving(false);
                          }
                        }}
                      >
                        {shotMetaSaving ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                          </span>
                        ) : (
                          'Save changes'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                        disabled={shotMetaSaving}
                        onClick={() => {
                          setEditShotOpen(false);
                          setShotMetaError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description / Notes */}
            {photo.notes && (
              <div className="card px-5 py-4" style={{ borderColor: '#64748b' }}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#94a3b8', letterSpacing: '0.06em' }}>Description</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{photo.notes}</p>
              </div>
            )}

            {/* Related photos */}
            {relatedPhotos.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-5 tracking-tight" style={{ color: '#0f172a' }}>More Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {relatedPhotos.map((rp, i) => {
                    const rpReg = (rp.aircraft as any)?.registration || '?';
                    const rpOp = (rp.operator as any)?.name || '';
                    const rpImg = proxyImageUrl(rp.storage_path || '');
                    return (
                      <motion.div key={rp.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="card cursor-pointer group overflow-hidden"
                        onClick={() => onPhotoClick(rp.id)}>
                        <div className="aspect-[4/3] relative overflow-hidden" style={{ borderRadius: '12px 12px 0 0' }}>
                          <img src={rpImg} alt={rpReg}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            referrerPolicy="no-referrer" style={{ background: '#f1f5f9' }} />
                          <div className="photo-overlay absolute inset-0" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
                            <div className="text-xs font-semibold" style={{ color: '#fff' }}>{rpReg}</div>
                            {rpOp && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{rpOp}</div>}
                            <PhotoStarDisplay
                              ratingSum={rp.rating_sum ?? 0}
                              ratingCount={rp.rating_count ?? 0}
                              compact
                              labelColor="rgba(255,255,255,0.75)"
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-4">

            {/* Photographer card */}
            <div className="card p-4" style={{ borderColor: '#64748b' }}>
              <div className="flex items-center gap-3 mb-3">
                {uploaderAvatar ? (
                  <img src={proxyImageUrl(uploaderAvatar)} alt={uploaderName}
                    className="w-10 h-10 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: '#0f172a', color: '#fff' }}>
                    {uploaderName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{uploaderName}</div>
                  <div className="text-[11px]" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>@{uploaderUsername}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2.5" style={{ borderTop: '1px solid #f5f5f7' }}>
                <div className="flex-1 text-center">
                  <div className="text-xs font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{uploaderPhotos.toLocaleString()}</div>
                  <div className="text-[10px]" style={{ color: '#94a3b8' }}>Photos</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs font-semibold" style={{ color: '#0f172a' }}>{uploaderRank}</div>
                  <div className="text-[10px]" style={{ color: '#94a3b8' }}>Rank</div>
                </div>
              </div>
            </div>

            {/* Aircraft quick info */}
            {(typeName || airlineName) && (
              <div
                className="card p-4"
                onClick={() => canOpenAircraft && onOpenAircraft(reg)}
                style={{ cursor: canOpenAircraft ? 'pointer' : 'default', borderColor: '#64748b' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <Plane className="w-4 h-4" style={{ color: '#0ea5e9' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#0ea5e9', fontFamily: '"SF Mono",monospace' }}>{reg}</div>
                    {typeName && <div className="text-[11px]" style={{ color: '#475569' }}>{typeName}</div>}
                  </div>
                </div>
                {airlineName && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate('fleet'); }}
                    className="flex items-center justify-between py-2"
                    style={{ borderTop: '1px solid #f5f5f7', width: '100%', background: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer' }}>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>Operator</span>
                    <span className="text-xs font-medium" style={{ color: '#0f172a' }}>{airlineName}{airlineIata ? ` (${airlineIata})` : ''}</span>
                  </button>
                )}
              </div>
            )}

            {/* Location */}
            <button
              onClick={() => canOpenAirport && onOpenMapAirport(airportIata)}
              className="card p-4 w-full text-left"
              style={{ cursor: canOpenAirport ? 'pointer' : 'default', borderColor: '#64748b' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <MapPin className="w-4 h-4" style={{ color: '#475569' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{airportIata || '—'}</div>
                    <div className="text-[11px]" style={{ color: '#475569' }}>
                      {airportName ? `${airportName}${airportCity ? `, ${airportCity}` : ''}` : 'Airport not linked to this photo'}
                    </div>
                  </div>
                </div>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
            onClick={() => setLightbox(false)}>

            <button className="absolute top-4 right-4 p-3 rounded-full z-10"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
              onClick={() => setLightbox(false)}>
              <X className="w-5 h-5" />
            </button>

            <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
              <span className="text-sm font-bold" style={{ color: '#fff', fontFamily: '"SF Mono",monospace' }}>{reg}</span>
              {airlineName && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>{airlineName}</span>}
              {airportIata && <span className="text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>· {airportIata}</span>}
            </div>

            <img
              src={imgUrl}
              alt={reg}
              className="max-w-full max-h-full object-contain p-4"
              style={{ cursor: 'default' }}
              onClick={e => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <span className="text-xs flex items-center gap-1.5" style={{ color: '#ffffff' }}>
                  <Camera className="w-3 h-3" />{uploaderName}
                </span>
                {shotDate && (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>· {shotDate}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
