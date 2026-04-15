import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Eye, Camera, MapPin, Calendar, Plane, User,
  ChevronLeft, ChevronRight, X, Maximize2, Download, Share2,
  CheckCircle2, Clock, Loader2, AlertCircle, Pencil, Hash,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { searchAirports, type Airport } from '../airports';
import { proxyAvatarUrl, proxyImageUrl } from '../lib/storage';
import { Page } from '../types';
import { PhotoStarRating, PhotoStarDisplay } from './PhotoStarRating';
import { galleryFrameClass } from '../lib/gallery-aspect';
import { isAirportGalleryEntry } from '../lib/photo-gallery-filter';

interface PhotoDetailPageProps {
  photoId: string | null;
  onBack: () => void;
  onPhotoClick: (id: string) => void;
  onOpenAircraft: (registration: string) => void;
  onNavigate: (page: Page) => void;
  onOpenMapAirport: (iata: string) => void;
  /** Opens spotter profile (e.g. from App `openSpotterProfile`). */
  onOpenUploaderProfile?: (userId: string) => void;
}

interface PhotoData {
  id: string;
  aircraft_id: string | null;
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
  aircraft: { registration: string; msn?: string | null; aircraft_types?: { name?: string; manufacturer?: string } | null } | null;
  operator: { name: string; iata?: string } | null;
  airport: { iata: string; name?: string; city?: string } | null;
  uploader: { id: string; username: string; display_name: string | null; rank: string | null; approved_uploads: number } | null;
}

interface RelatedPhoto {
  id: string;
  storage_path: string;
  category?: string | null;
  like_count: number;
  view_count: number;
  rating_sum?: number;
  rating_count?: number;
  width_px?: number | null;
  height_px?: number | null;
  aircraft: { registration: string } | null;
  operator: { name: string } | null;
  airport: { iata: string; name?: string | null } | null;
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

/** One line for grid: skip duplicate manufacturer when `name` already starts with it (e.g. "Airbus" + "Airbus A320"). */
function aircraftTypeDisplayLine(manufacturer: string | undefined | null, typeName: string | undefined | null): string {
  const m = (manufacturer || '').trim();
  const n = (typeName || '').trim();
  if (!n) return m;
  if (!m) return n;
  const ml = m.toLowerCase();
  const nl = n.toLowerCase();
  if (nl === ml || nl.startsWith(`${ml} `) || nl.startsWith(`${ml}-`)) return n;
  return `${m} ${n}`;
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

export const PhotoDetailPage = ({
  photoId,
  onBack,
  onPhotoClick,
  onOpenAircraft,
  onNavigate,
  onOpenMapAirport,
  onOpenUploaderProfile,
}: PhotoDetailPageProps) => {
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
          aircraft(registration, msn, aircraft_types(name, manufacturer)),
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
          'id, storage_path, category, like_count, view_count, rating_sum, rating_count, width_px, height_px, aircraft(registration), operator:airlines(name), airport:airports(iata, name)',
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
  const msnRaw = (photo.aircraft as any)?.msn;
  const msnDisplay = (typeof msnRaw === 'string' && msnRaw.trim()) ? msnRaw.trim() : '—';
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

  type MetaRow = {
    key: string;
    icon: typeof Plane;
    label: string;
    value: string;
    wrap?: boolean;
    mono?: boolean;
    accent?: boolean;
    onClick?: () => void;
  };

  /** Left: airline → type → registration → MSN. Right: airport (top) → taken → uploaded → category (bottom). */
  const metaLeft: MetaRow[] = [];
  const metaRight: MetaRow[] = [];

  if (!isAirportScene) {
    metaLeft.push({
      key: 'airline',
      icon: Camera,
      label: 'Airline',
      value: airlineName ? `${airlineName}${airlineIata ? ` (${airlineIata})` : ''}` : 'Not linked',
      onClick: () => onNavigate('fleet'),
    });
    if (typeName) {
      metaLeft.push({
        key: 'type',
        icon: Plane,
        label: 'Type',
        value: aircraftTypeDisplayLine(manufacturer, typeName),
        onClick: canOpenAircraft ? () => onOpenAircraft(reg) : undefined,
      });
    }
    metaLeft.push({
      key: 'registration',
      icon: Plane,
      label: 'Registration',
      value: reg,
      mono: true,
      accent: true,
      onClick: canOpenAircraft ? () => onOpenAircraft(reg) : undefined,
    });
    metaLeft.push({
      key: 'msn',
      icon: Hash,
      label: 'MSN',
      value: msnDisplay,
      mono: true,
    });
  }

  const metaAirport: MetaRow = {
    key: 'airport',
    icon: MapPin,
    label: 'Airport',
    value: airportIata
      ? `${airportIata}${airportName ? ` — ${airportName}` : ''}${airportCity ? `, ${airportCity}` : ''}`
      : 'Not linked',
    wrap: true,
    onClick: canOpenAirport && airportIata ? () => onOpenMapAirport(airportIata) : undefined,
  };
  metaRight.push(metaAirport);

  if (shotDate) {
    metaRight.push({ key: 'taken', icon: Calendar, label: 'Taken', value: shotDate });
  }
  metaRight.push({ key: 'uploaded', icon: Clock, label: 'Uploaded', value: uploadedDate });

  if (category) {
    metaRight.push({ key: 'category', icon: Camera, label: 'Category', value: category });
  }

  const renderMetaCell = (row: MetaRow) => {
    const Icon = row.icon;
    const valueStyle: React.CSSProperties = {
      color: row.accent ? '#0ea5e9' : '#0f172a',
      fontFamily: row.mono ? '"SF Mono",monospace' : undefined,
    };
    const rowInner = (
      <>
        <Icon className="w-3.5 h-3.5 shrink-0 translate-y-px" style={{ color: '#cbd5e1' }} />
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span
            className="text-[9px] uppercase tracking-wider font-medium shrink-0 w-[5.5rem] sm:w-24"
            style={{ color: '#94a3b8', letterSpacing: '0.05em' }}
          >
            {row.label}
          </span>
          <span
            className={`text-xs font-medium min-w-0 flex-1 ${row.wrap ? 'whitespace-normal break-words leading-snug' : 'truncate'}`}
            style={valueStyle}
          >
            {row.value}
          </span>
        </div>
      </>
    );
    const baseCell = 'flex gap-2 items-baseline py-1 border-b border-slate-100 w-full text-left bg-white';
    if (row.onClick) {
      return (
        <button
          key={row.key}
          type="button"
          onClick={row.onClick}
          className={`${baseCell} transition-colors hover:bg-slate-50/80 border-0 border-b border-slate-100`}
          style={{ cursor: 'pointer' }}
        >
          {rowInner}
        </button>
      );
    }
    return (
      <div key={row.key} className={baseCell} style={{ background: '#fff' }}>
        {rowInner}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      {/* Back bar */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-3 flex items-center justify-between">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors hover:text-slate-900"
            style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
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
              decoding="async"
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

      {/* Content — single column under the photo, no empty sidebar */}
      <div className="site-w py-4 md:py-5">
        <div className="w-full space-y-3">

          <div className="card overflow-hidden" style={{ borderColor: '#64748b' }}>
            <div className="px-4 pt-3 pb-3 border-b" style={{ borderColor: '#f1f5f9', background: '#fafbfc' }}>
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {canOpenAircraft ? (
                      <button
                        type="button"
                        onClick={() => onOpenAircraft(reg)}
                        className="font-headline text-2xl sm:text-[1.65rem] font-bold tracking-tight leading-tight"
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
                        className="font-headline text-2xl sm:text-[1.65rem] font-bold tracking-tight leading-tight"
                        style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
                      >
                        {headlineTitle}
                      </span>
                    )}
                    {photo.status === 'PENDING' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>Pending review</span>}
                    {photo.status === 'APPROVED' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>Approved</span>}
                    {photo.is_featured && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>Featured</span>}
                    <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: '#475569', fontFamily: '"SF Mono",monospace' }}>
                      <Eye className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />{(photo.view_count || 0).toLocaleString()}
                    </span>
                    <PhotoStarRating
                      photoId={photo.id}
                      ratingSum={photo.rating_sum ?? 0}
                      ratingCount={photo.rating_count ?? 0}
                      large
                      onAggregatesChange={(sum, cnt) => setPhoto(p => (p ? { ...p, rating_sum: sum, rating_count: cnt } : p))}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 lg:items-end">
                  {uploaderId && (
                    <button
                      type="button"
                      onClick={() => onOpenUploaderProfile?.(uploaderId)}
                      disabled={!onOpenUploaderProfile}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left w-full lg:w-auto max-w-xs transition-colors ${onOpenUploaderProfile ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default opacity-90'}`}
                      style={{ borderColor: '#e2e8f0', background: '#fff' }}
                    >
                      {uploaderAvatar ? (
                        <img src={proxyAvatarUrl(uploaderAvatar)} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0" style={{ background: '#0f172a', color: '#fff' }}>
                          {uploaderName[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>{uploaderName}</div>
                        <div className="text-[10px] truncate leading-tight" style={{ color: '#94a3b8' }}>
                          @{uploaderUsername}
                          <span className="text-slate-300"> · </span>
                          {uploaderPhotos.toLocaleString()} photos
                          <span className="text-slate-300"> · </span>
                          {uploaderRank}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-3 py-2 md:px-4 md:py-2" style={{ background: '#fff' }}>
              {metaLeft.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-10">
                  <div className="min-w-0 flex flex-col">{metaLeft.map(renderMetaCell)}</div>
                  <div className="min-w-0 flex flex-col max-md:border-t max-md:border-slate-100 max-md:mt-1 max-md:pt-2 md:border-l md:border-slate-100 md:pl-10">
                    {metaRight.map(renderMetaCell)}
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex flex-col">{metaRight.map(renderMetaCell)}</div>
              )}
            </div>
          </div>

            {canEditShotMeta && (
              <div className="card overflow-hidden" style={{ borderColor: '#64748b' }}>
                <div
                  className="flex items-center justify-between px-3 py-2 border-b"
                  style={{ borderColor: '#f1f5f9', background: '#fafbfc' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Pencil className="w-3 h-3 shrink-0" style={{ color: '#94a3b8' }} />
                    <span className="text-xs font-semibold truncate" style={{ color: '#0f172a' }}>
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
                  <div className="px-3 py-3 space-y-3">
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
              <div className="card px-4 py-3" style={{ borderColor: '#64748b' }}>
                <h3 className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#94a3b8', letterSpacing: '0.06em' }}>Description</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{photo.notes}</p>
              </div>
            )}

            {/* Related photos */}
            {relatedPhotos.length > 0 && (
              <div>
                <h3 className="text-base font-bold mb-3 tracking-tight" style={{ color: '#0f172a' }}>More Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-start">
                  {relatedPhotos.map((rp, i) => {
                    const rpImg = proxyImageUrl(rp.storage_path || '');
                    const reg = (rp.aircraft as { registration?: string } | null)?.registration?.trim();
                    const apIata = (rp.airport as { iata?: string } | null)?.iata?.trim().toUpperCase();
                    const apName = (rp.airport as { name?: string | null } | null)?.name?.trim();
                    const rpOp = (rp.operator as { name?: string } | null)?.name?.trim() || '';
                    const airportScene = isAirportGalleryEntry(rp);
                    const sceneFromCat = String(rp.category || '')
                      .replace(/^AIRPORT_/, '')
                      .replace(/_/g, ' ')
                      .trim();
                    const primaryLabel = reg
                      ? reg
                      : apIata
                        ? apIata
                        : airportScene && sceneFromCat
                          ? sceneFromCat.replace(/\b\w/g, (c) => c.toUpperCase())
                          : '?';
                    const secondaryLabel = reg ? rpOp : apName || rpOp;
                    return (
                      <motion.div key={rp.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="card cursor-pointer group overflow-hidden"
                        onClick={() => onPhotoClick(rp.id)}>
                        <div
                          className={`relative overflow-hidden bg-[#f1f5f9] ${galleryFrameClass(rp.width_px, rp.height_px)}`}
                          style={{ borderRadius: '12px 12px 0 0' }}
                        >
                          <img src={rpImg} alt={primaryLabel}
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
                            referrerPolicy="no-referrer" />
                          <div className="photo-overlay absolute inset-0" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
                            <div className="text-xs font-semibold" style={{ color: '#fff' }}>{primaryLabel}</div>
                            {secondaryLabel ? (
                              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{secondaryLabel}</div>
                            ) : null}
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
