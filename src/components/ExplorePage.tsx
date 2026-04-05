import { motion } from 'motion/react';
import { Eye, Camera, Plane, MapPin, TrendingUp, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Page } from '../types';
import React from 'react';
import { supabase } from '../lib/supabase';
import { proxyImageUrl } from '../lib/storage';
import { isAirportGalleryEntry } from '../lib/photo-gallery-filter';
import { PhotoStarRating, PhotoStarDisplay } from './PhotoStarRating';

const FILTERS = ['All', 'Takeoff', 'Landing', 'Static', 'Night', 'Airport'];

const PHOTO_SELECT =
  'id, storage_path, status, category, view_count, like_count, rating_sum, rating_count, width_px, height_px, aircraft(registration), operator:airlines(name), airport:airports(iata)';

type ExplorePhoto = {
  id: string;
  storage_path?: string;
  view_count?: number;
  like_count?: number;
  rating_sum?: number;
  rating_count?: number;
  width_px?: number | null;
  height_px?: number | null;
  category?: string;
  views_today?: number;
  aircraft?: unknown;
  operator?: unknown;
  airport?: unknown;
};

function photoMeta(p: ExplorePhoto) {
  const ap = (p.airport as { iata?: string })?.iata;
  const acReg = (p.aircraft as { registration?: string })?.registration;
  const airportGallery = isAirportGalleryEntry(p);
  return {
    reg: acReg || (airportGallery ? ap || 'APT' : '?'),
    op: (p.operator as { name?: string })?.name || '',
    ap: (p.airport as { iata?: string })?.iata || '',
    imgUrl: proxyImageUrl(p.storage_path || ''),
  };
}

function primaryFrameClass(w?: number | null, h?: number | null): string {
  if (w && h && w > 0 && h > 0) {
    const r = w / h;
    // Between 4:3 (~1.33) and 16:9 (~1.78): treat ~3:2 and wider as 16:9 frame
    return r >= 1.5 ? 'aspect-video' : 'aspect-[4/3]';
  }
  return 'aspect-video';
}

/** Corner brackets + faint crosshair — scales with main spotlight frame (4:3 / 16:9) via container queries */
function HudViewportChrome() {
  const bracket: React.CSSProperties = {
    width: 'min(1.75rem, 11cqmin)',
    height: 'min(1.75rem, 11cqmin)',
  };
  const inset = 'min(0.65rem, 3.2cqmin)';
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center opacity-[0.14]" aria-hidden>
        <div
          className="absolute h-px bg-slate-400/35"
          style={{ width: 'min(50%, 36rem, 92cqw)' }}
        />
        <div
          className="absolute w-px bg-slate-400/35"
          style={{ height: 'min(45%, 18rem, 88cqh)' }}
        />
      </div>
      <div
        className="pointer-events-none absolute z-[7]"
        style={{ top: inset, right: inset, bottom: inset, left: inset }}
        aria-hidden
      >
        <div className="absolute top-0 left-0 border-t border-l border-emerald-600/30" style={bracket} />
        <div className="absolute top-0 right-0 border-t border-r border-emerald-600/30" style={bracket} />
        <div className="absolute bottom-0 left-0 border-b border-l border-emerald-600/30" style={bracket} />
        <div className="absolute bottom-0 right-0 border-b border-r border-emerald-600/30" style={bracket} />
      </div>
    </>
  );
}

type SpotterRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  today_views: number;
};

async function loadExplorePhotos(): Promise<ExplorePhoto[]> {
  const todayUtc = new Date().toISOString().slice(0, 10);

  const dailyRes = await supabase
    .from('photo_daily_views')
    .select('photo_id, views')
    .eq('view_date', todayUtc)
    .order('views', { ascending: false })
    .limit(40);

  const dailyRows = dailyRes.error ? [] : (dailyRes.data ?? []);

  const dailyOrder = new Map<string, { i: number; views: number }>();
  dailyRows.forEach((r, i) => dailyOrder.set(r.photo_id, { i, views: r.views }));

  const { data: fallback } = await supabase
    .from('photos')
    .select(PHOTO_SELECT)
    .eq('status', 'APPROVED')
    .order('view_count', { ascending: false })
    .limit(36);

  const primaryIds = dailyRows.map(r => r.photo_id);
  let primary: ExplorePhoto[] = [];
  if (primaryIds.length) {
    const { data } = await supabase.from('photos').select(PHOTO_SELECT).in('id', primaryIds).eq('status', 'APPROVED');
    primary = (data ?? []) as ExplorePhoto[];
    primary.sort((a, b) => {
      const da = dailyOrder.get(a.id)?.views ?? 0;
      const db = dailyOrder.get(b.id)?.views ?? 0;
      if (db !== da) return db - da;
      return (dailyOrder.get(a.id)?.i ?? 999) - (dailyOrder.get(b.id)?.i ?? 999);
    });
  }

  const seen = new Set(primary.map(p => p.id));
  const merged: ExplorePhoto[] = [...primary];
  for (const p of (fallback ?? []) as ExplorePhoto[]) {
    if (merged.length >= 24) break;
    if (!seen.has(p.id)) {
      merged.push(p);
      seen.add(p.id);
    }
  }

  // Recent approved (incl. low view_count) so new airport scenes and fresh uploads surface
  const { data: recentApproved } = await supabase
    .from('photos')
    .select(PHOTO_SELECT)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: false })
    .limit(20);
  for (const p of (recentApproved ?? []) as ExplorePhoto[]) {
    if (merged.length >= 28) break;
    if (!seen.has(p.id)) {
      merged.push(p);
      seen.add(p.id);
    }
  }

  return merged.map(p => ({
    ...p,
    views_today: dailyOrder.get(p.id)?.views ?? 0,
    rating_sum: p.rating_sum ?? 0,
    rating_count: p.rating_count ?? 0,
  }));
}

export const ExplorePage = ({
  onAircraftClick,
  setCurrentPage,
  onPhotoClick,
}: {
  onAircraftClick: (registration?: string) => void;
  setCurrentPage: (p: Page) => void;
  onPhotoClick?: (id: string) => void;
}) => {
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<ExplorePhoto[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [topSpotters, setTopSpotters] = useState<SpotterRow[]>([]);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  const bufferStripRef = useRef<HTMLDivElement>(null);

  const sortedFiltered = useMemo(() => {
    const base =
      filter === 'All'
        ? [...photos]
        : filter === 'Airport'
          ? photos.filter((p) => isAirportGalleryEntry(p))
          : photos.filter((p) => p.category?.toLowerCase() === filter.toLowerCase());
    base.sort((a, b) => {
      const vt = (b.views_today || 0) - (a.views_today || 0);
      if (vt !== 0) return vt;
      return (b.view_count || 0) - (a.view_count || 0);
    });
    return base;
  }, [photos, filter]);

  useEffect(() => {
    if (sortedFiltered.length === 0) {
      setSpotlightId(null);
      return;
    }
    setSpotlightId(prev =>
      prev && sortedFiltered.some(p => p.id === prev) ? prev : sortedFiltered[0].id,
    );
  }, [filter, sortedFiltered]);

  /** Vertical mouse wheel → horizontal buffer strip; `loading` ensures listener after strip mounts. */
  useLayoutEffect(() => {
    const el = bufferStripRef.current;
    if (!el) return;

    const lineHeight = 32;

    const onWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return;

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        dx *= lineHeight;
        dy *= lineHeight;
      } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        dx *= el.clientWidth;
        dy *= el.clientWidth;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        const next = el.scrollLeft + dx;
        const clamped = Math.max(0, Math.min(maxScroll, next));
        if (clamped !== el.scrollLeft) {
          e.preventDefault();
          el.scrollLeft = clamped;
        }
        return;
      }

      if (dy === 0) return;

      const next = el.scrollLeft + dy;
      const clamped = Math.max(0, Math.min(maxScroll, next));
      if (clamped !== el.scrollLeft) {
        e.preventDefault();
        el.scrollLeft = clamped;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [spotlightId, sortedFiltered.length, loading]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [merged, latestRes, spotRpc] = await Promise.all([
        loadExplorePhotos(),
        supabase
          .from('photos')
          .select('id, storage_path')
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false })
          .limit(24),
        supabase.rpc('top_spotters_today', { limit_n: 48 }),
      ]);

      setPhotos(merged);
      setLatest(latestRes.data ?? []);
      if (spotRpc.error) {
        console.warn('top_spotters_today:', spotRpc.error.message);
        setTopSpotters([]);
      } else {
        setTopSpotters((spotRpc.data ?? []) as SpotterRow[]);
      }
    } catch (err) {
      console.error('Error loading explore data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(false);
    const t = setInterval(() => void loadData(true), 90_000);
    return () => clearInterval(t);
  }, []);

  const patchPhotoAggregates = (id: string, sum: number, cnt: number) => {
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, rating_sum: sum, rating_count: cnt } : p)));
  };

  const spotlight = sortedFiltered.length
    ? (sortedFiltered.find(p => p.id === spotlightId) ?? sortedFiltered[0])
    : null;
  const spotlightMeta = spotlight ? photoMeta(spotlight) : null;
  const frameCls = spotlight ? primaryFrameClass(spotlight.width_px, spotlight.height_px) : 'aspect-video';

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }} className="page-shell relative z-10">
      <div className="site-w pt-3 sm:pt-4 pb-8">
        {/* Hero: spotters + primary + buffer + filters — full grid width */}
        <section className="mb-10">
          {topSpotters.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: '#94a3b8' }}>
                Spotters today
              </p>
              <div className="flex items-start gap-1 sm:gap-2 overflow-x-auto pb-2 no-scrollbar">
                {topSpotters.map(s => {
                  const label = s.display_name || s.username || 'Spotter';
                  const initials = label.trim().slice(0, 1).toUpperCase() || '?';
                  return (
                    <div
                      key={s.user_id}
                      className="shrink-0 flex flex-col items-center gap-1 w-[4.5rem] sm:w-[3.75rem]"
                      title={`${label} · ${s.today_views.toLocaleString()} views today (UTC)`}
                    >
                      <div
                        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold border"
                        style={{
                          borderColor: '#e2e8f0',
                          background: '#fff',
                          color: '#0f172a',
                        }}
                      >
                        {s.avatar_url ? (
                          <img
                            src={proxyImageUrl(s.avatar_url)}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <span
                        className="text-[9px] leading-tight text-center w-full truncate tabular-nums"
                        style={{ color: '#64748b', fontFamily: '"B612 Mono", monospace' }}
                      >
                        {s.today_views > 0 ? s.today_views.toLocaleString() : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border bg-[#f8fafc]" style={{ borderColor: '#e2e8f0' }}>
            <div className="p-4 sm:p-5 md:p-6 min-w-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#94a3b8' }} />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    Loading…
                  </span>
                </div>
              ) : sortedFiltered.length === 0 ? (
                <div className="text-center py-20 rounded-xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
                  <Camera className="w-11 h-11 mx-auto mb-3" style={{ color: '#e2e8f0' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>No photos in this view</p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>Try another category or upload to populate the feed.</p>
                </div>
              ) : spotlight ? (
                <>
                  <motion.div
                    key={spotlight.id}
                    initial={{ opacity: 0.92 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.22 }}
                    className="relative overflow-hidden rounded-xl border bg-white card w-full"
                    style={{
                      borderColor: '#e2e8f0',
                      boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
                    }}
                  >
                    <button
                      type="button"
                      className="w-full text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      onClick={() => onPhotoClick?.(spotlight.id)}
                    >
                      <div
                        className={`relative flex items-center justify-center overflow-hidden bg-[#e8ecf1] w-full ${frameCls}`}
                        style={{
                          maxHeight: 'min(72vh, 820px)',
                          containerType: 'size',
                        }}
                      >
                        <HudViewportChrome />
                        <img
                          src={spotlightMeta!.imgUrl}
                          alt={spotlightMeta!.reg}
                          className="relative z-[2] w-full h-full object-contain px-2 py-2 sm:px-4 sm:py-3 transition-[filter] duration-300 group-hover:brightness-[1.02]"
                          referrerPolicy="no-referrer"
                          decoding="async"
                        />
                      </div>
                    </button>
                    <div
                      role="button"
                      tabIndex={0}
                      className="explore-telemetry w-full text-left border-t bg-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/40"
                      style={{ borderColor: '#f1f5f9' }}
                      onClick={() => onPhotoClick?.(spotlight.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPhotoClick?.(spotlight.id);
                        }
                      }}
                    >
                      <div className="px-3 sm:px-4 py-2 space-y-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-lg sm:text-xl font-bold font-mono tracking-tight leading-tight"
                              style={{ color: '#0f766e', letterSpacing: '0.02em' }}
                            >
                              {spotlightMeta!.reg}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs sm:text-sm font-mono" style={{ color: '#64748b' }}>
                            <span className="flex items-center gap-1.5 tabular-nums">
                              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                              {(spotlight.view_count || 0).toLocaleString()}
                            </span>
                            {spotlight.views_today != null && spotlight.views_today > 0 && (
                              <span className="tabular-nums normal-case text-slate-400">
                                +{spotlight.views_today} today
                              </span>
                            )}
                            <div onClick={e => e.stopPropagation()} className="inline-flex">
                              <PhotoStarRating
                                photoId={spotlight.id}
                                ratingSum={spotlight.rating_sum ?? 0}
                                ratingCount={spotlight.rating_count ?? 0}
                                compact
                                dense
                                onAggregatesChange={(sum, cnt) => patchPhotoAggregates(spotlight.id, sum, cnt)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] font-mono leading-snug" style={{ color: '#475569' }}>
                          {spotlightMeta!.op || '—'}
                          {spotlightMeta!.ap ? (
                            <>
                              <span className="mx-1.5 text-slate-300">│</span>
                              <span className="text-amber-900 font-medium">{spotlightMeta!.ap}</span>
                            </>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: '#f1f5f9' }}>
                          <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.1em] text-slate-400">
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            Open full record
                          </span>
                          {spotlight.category ? (
                            <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-amber-800/80">
                              {String(spotlight.category).replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <div className="mt-4 min-w-0">
                    <div
                      className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2 flex items-center gap-2 font-mono text-slate-500 explore-telemetry"
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
                      Buffer list · {sortedFiltered.length} tracks · by views today
                    </div>
                    <div
                      ref={bufferStripRef}
                      className="flex gap-2.5 sm:gap-3 overflow-x-auto overflow-y-visible pb-2 snap-x snap-proximity min-w-0 w-full max-w-full explore-buffer-strip-scroll"
                      style={{ scrollPaddingInlineEnd: '1.5rem' }}
                    >
                      {sortedFiltered.map((p, idx) => {
                        const { reg, op, ap, imgUrl } = photoMeta(p);
                        const active = p.id === spotlight.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSpotlightId(p.id)}
                            className="explore-telemetry shrink-0 snap-start text-left flex flex-col w-[11.5rem] sm:w-[13rem] md:w-[14rem] rounded-lg border transition-all duration-200 font-mono bg-white overflow-hidden"
                            style={{
                              borderColor: active ? '#6ee7b7' : '#e2e8f0',
                              boxShadow: active ? 'inset 0 -2px 0 #10b981' : 'none',
                              background: active ? '#f0fdf4' : '#fff',
                            }}
                          >
                            <div
                              className="relative w-full aspect-[5/3] overflow-hidden border-b bg-slate-200/90"
                              style={{ borderColor: active ? '#a7f3d0' : '#e2e8f0' }}
                            >
                              <img
                                src={imgUrl}
                                alt=""
                                loading={idx > 5 ? 'lazy' : 'eager'}
                                className="w-full h-full object-contain object-center"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="px-1.5 py-1.5 min-w-0">
                              <div className={`text-[11px] font-bold truncate leading-tight ${active ? 'text-emerald-900' : 'text-slate-900'}`}>
                                {reg}
                              </div>
                              <div className="text-[9px] truncate leading-tight mt-0.5 text-slate-600">
                                {op || '—'}
                                {ap ? <span className="text-amber-800"> · {ap}</span> : null}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 tabular-nums">
                                <Eye className="w-4 h-4 shrink-0 opacity-90" />
                                <span>{(p.views_today || 0) > 0 ? `+${p.views_today} today` : (p.view_count || 0).toLocaleString()}</span>
                              </div>
                              <div className="mt-1 pt-1 border-t" style={{ borderColor: '#f1f5f9' }} onClick={e => e.stopPropagation()}>
                                <PhotoStarDisplay
                                  ratingSum={p.rating_sum ?? 0}
                                  ratingCount={p.rating_count ?? 0}
                                  compact
                                  dense
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {/* Spacer so the last card can scroll fully into view (not clipped at the right edge). */}
                      <div className="shrink-0 w-3 sm:w-6 md:w-8" aria-hidden />
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
                    <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: '#94a3b8' }}>
                      Categories
                    </span>
                    {FILTERS.map(f => {
                      const on = filter === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilter(f)}
                          className="text-xs px-3 py-1.5 uppercase tracking-wider transition-all"
                          style={{
                            fontFamily: '"JetBrains Mono", monospace',
                            background: on ? '#ecfdf5' : '#fff',
                            color: on ? '#047857' : '#64748b',
                            border: `1px solid ${on ? '#6ee7b7' : '#e2e8f0'}`,
                            borderRadius: 4,
                            fontWeight: on ? 600 : 400,
                          }}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <div className="min-w-0">
            <section style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }} className="p-6 sm:p-8">
              <div className="mb-10">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: '#2d2d2d', boxShadow: 'none' }}
                >
                  <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
                    <h2
                      className="font-headline text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-white"
                    >
                      Latest photos
                    </h2>
                  </div>
                  {latest.length === 0 ? (
                    <p className="px-4 pb-4 text-xs" style={{ color: '#a1a1aa' }}>No recent uploads.</p>
                  ) : (
                    <div
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 bg-[#1f1f1f] gap-px p-px"
                      style={{ borderTop: '1px solid #3f3f3f' }}
                    >
                      {latest.map((item, i) => {
                        const imgUrl = proxyImageUrl(item.storage_path || '');
                        return (
                          <motion.button
                            key={item.id}
                            type="button"
                            onClick={() => onPhotoClick?.(item.id)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.02, 0.35) }}
                            className="relative aspect-square w-full overflow-hidden bg-[#2a2a2a] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
                            style={{ border: 'none', padding: 0, cursor: 'pointer' }}
                            aria-label="Open photo"
                          >
                            <img
                              src={imgUrl}
                              alt=""
                              loading={i > 8 ? 'lazy' : 'eager'}
                              className="h-full w-full object-cover transition-opacity duration-200 hover:opacity-[0.92]"
                              referrerPolicy="no-referrer"
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start pt-2 border-t" style={{ borderColor: '#e2e8f0' }}>
                {[
                  { icon: TrendingUp, title: 'Fleet Analytics', desc: 'Browse airline fleet compositions grouped by manufacturer and aircraft family.', page: 'fleet' as Page },
                  { icon: MapPin, title: 'Airport Map', desc: 'Interactive map with spotting airports worldwide.', page: 'map' as Page },
                ].map(block => {
                  const Icon = block.icon;
                  return (
                    <div key={block.title} className="card p-6 cursor-pointer group bg-white" onClick={() => setCurrentPage(block.page)}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                        <Icon className="w-4 h-4" style={{ color: '#475569' }} />
                      </div>
                      <h4 className="font-headline text-base font-bold mb-2" style={{ color: '#0f172a' }}>{block.title}</h4>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748b' }}>{block.desc}</p>
                      <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#0ea5e9' }}>
                        Explore <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button onClick={() => setCurrentPage('stats')} className="text-sm font-medium transition-colors" style={{ color: '#0ea5e9' }}>View stats →</button>
              </div>
            </section>
        </div>
      </div>

      <section
        className="py-20 text-center relative z-10"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(15,23,42,0.06)',
        }}
      >
        <div className="max-w-lg mx-auto px-4">
          <h2 className="font-headline text-3xl font-bold mb-4" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>
            Start contributing today.
          </h2>
          <p className="text-base mb-8" style={{ color: '#475569' }}>
            Join the SILKSPOT community and help build the most accurate aviation spotting database.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => setCurrentPage('upload')} className="btn-primary" style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Upload a photo</button>
            <button onClick={() => setCurrentPage('fleet')} className="btn-secondary" style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Browse fleet database</button>
          </div>
        </div>
      </section>
    </div>
  );
};
