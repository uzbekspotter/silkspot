import { motion } from 'motion/react';
import { Eye, Heart, Camera, Plane, MapPin, TrendingUp, Users, Globe2, ChevronRight, Clock, Loader2, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Page } from '../types';
import React from 'react';
import { supabase } from '../lib/supabase';
import { proxyImageUrl } from '../lib/storage';

const FILTERS = ['All', 'Takeoff', 'Landing', 'Static', 'Night'];

type FeaturedPhoto = {
  id: string;
  storage_path?: string;
  view_count?: number;
  like_count?: number;
  category?: string;
  aircraft?: unknown;
  operator?: unknown;
  airport?: unknown;
};

function photoMeta(p: FeaturedPhoto) {
  return {
    reg: (p.aircraft as { registration?: string })?.registration || '?',
    op: (p.operator as { name?: string })?.name || '',
    ap: (p.airport as { iata?: string })?.iata || '',
    imgUrl: proxyImageUrl(p.storage_path || ''),
  };
}

/** Corner brackets + faint crosshair — no grid (keeps photo clean) */
function HudViewportChrome() {
  const w = 20;
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center opacity-[0.18]" aria-hidden>
        <div className="absolute w-[50%] max-w-xl h-px bg-slate-400/35" />
        <div className="absolute h-[45%] max-h-72 w-px bg-slate-400/35" />
      </div>
      <div className="pointer-events-none absolute inset-3 sm:inset-4 z-[7]" aria-hidden>
        <div className="absolute top-0 left-0 border-t border-l border-emerald-600/35" style={{ width: w, height: w }} />
        <div className="absolute top-0 right-0 border-t border-r border-emerald-600/35" style={{ width: w, height: w }} />
        <div className="absolute bottom-0 left-0 border-b border-l border-emerald-600/35" style={{ width: w, height: w }} />
        <div className="absolute bottom-0 right-0 border-b border-r border-emerald-600/35" style={{ width: w, height: w }} />
      </div>
    </>
  );
}

export const ExplorePage = ({ onAircraftClick, setCurrentPage, onPhotoClick }: {
  onAircraftClick: (registration?: string) => void;
  setCurrentPage: (p: Page) => void;
  onPhotoClick?: (id: string) => void;
}) => {
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [stats, setStats] = useState({ photos: 0, users: 0, airlines: 0 });
  const [topSpotters, setTopSpotters] = useState<any[]>([]);
  const [spotlightId, setSpotlightId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const filteredPhotos = filter === 'All'
    ? photos
    : photos.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  useEffect(() => {
    if (filteredPhotos.length === 0) {
      setSpotlightId(null);
      return;
    }
    setSpotlightId(prev =>
      prev && filteredPhotos.some((p: FeaturedPhoto) => p.id === prev)
        ? prev
        : (filteredPhotos[0] as FeaturedPhoto).id
    );
  }, [filter, photos]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [photosRes, latestRes, usersCount, spottersRes] = await Promise.all([
        supabase.from('photos')
          .select(`id, storage_path, status, category, view_count, like_count, aircraft(registration), operator:airlines(name), airport:airports(iata)`)
          .eq('status', 'APPROVED')
          .order('view_count', { ascending: false })
          .limit(12),
        supabase.from('photos')
          .select(`id, storage_path, created_at, aircraft(registration), operator:airlines(name), airport:airports(iata)`)
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles')
          .select('id, username, display_name, rank, approved_uploads')
          .order('approved_uploads', { ascending: false })
          .limit(4),
      ]);

      setPhotos(photosRes.data ?? []);
      setLatest(latestRes.data ?? []);
      setStats({
        photos: photosRes.data?.length ?? 0,
        users: usersCount.count ?? 0,
        airlines: 0,
      });
      setTopSpotters(spottersRes.data ?? []);
    } catch (err) {
      console.error('Error loading explore data:', err);
    } finally {
      setLoading(false);
    }
  };

  const spotlight = filteredPhotos.length
    ? (filteredPhotos.find((p: FeaturedPhoto) => p.id === spotlightId) ?? filteredPhotos[0])
    : null;
  const spotlightMeta = spotlight ? photoMeta(spotlight as FeaturedPhoto) : null;

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh' }} className="page-shell">
      <div className="site-w pt-3 sm:pt-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <aside
            className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 lg:sticky self-start z-0"
            style={{ top: 64 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border bg-white p-4 sm:p-5 card"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: '#94a3b8' }}>About</p>
              <h1 className="font-headline text-xl sm:text-2xl font-bold" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>SILKSPOT</h1>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: '#64748b' }}>
                Every photo tagged with registration, operator history, technical specs, and fleet metadata.
              </p>
              <div className="mt-4 pt-4 flex items-center gap-2.5 border-t" style={{ borderColor: '#f1f5f9' }}>
                <Users className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
                <span className="text-base font-semibold" style={{ color: '#0f172a', fontFamily: '"B612 Mono", monospace' }}>{stats.users.toLocaleString()}</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Spotters</span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={() => setCurrentPage('upload')} className="btn-primary w-full" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Upload a photo</button>
                <button type="button" onClick={() => setCurrentPage('fleet')} className="btn-secondary w-full" style={{ height: 40, padding: '0 16px', fontSize: 13 }}>Browse fleet</button>
              </div>
            </motion.div>
          </aside>

          <div className="lg:col-span-8 xl:col-span-9 order-1 lg:order-2 min-w-0">
            <section className="rounded-xl border bg-[#f8fafc] overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
              <div className="p-4 sm:p-5 md:p-6 pb-8 md:pb-10">
                <div className="flex items-end justify-between mb-5 flex-wrap gap-4">
                  <div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1.5"
                      style={{ color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}
                    >
                      Acquisition feed
                    </div>
                    <h2
                      className="text-xl sm:text-2xl font-bold tracking-tight"
                      style={{ color: '#0f172a', fontFamily: '"B612 Mono", monospace', letterSpacing: '-0.02em' }}
                    >
                      VISUAL / <span style={{ color: '#b45309' }}>FEATURED</span>
                    </h2>
                    <p className="text-xs mt-2 max-w-md" style={{ color: '#64748b', lineHeight: 1.55 }}>
                      Select a track in the buffer list — primary viewport updates. Tap the frame for full telemetry (photo page).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                </div>

                {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#94a3b8' }} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Syncing buffer…
              </span>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-20 rounded-xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
              <Camera className="w-11 h-11 mx-auto mb-3" style={{ color: '#e2e8f0' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>No contacts in feed</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Upload to populate the viewport.</p>
            </div>
          ) : spotlight ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-7 xl:col-span-8 order-1">
                <motion.div
                  key={spotlight.id}
                  initial={{ opacity: 0.92 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.22 }}
                  className="relative overflow-hidden rounded-xl border bg-white card"
                  style={{
                    borderColor: '#e2e8f0',
                    boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 border-b text-[10px] uppercase tracking-[0.18em] bg-[#f8fafc]"
                    style={{
                      borderColor: '#e2e8f0',
                      color: '#64748b',
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    <span>Primary sensor</span>
                    <span className="text-amber-700 font-semibold">LIVE</span>
                  </div>
                  <button
                    type="button"
                    className="w-full text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white pt-9"
                    onClick={() => onPhotoClick?.(spotlight.id)}
                  >
                    <div
                      className="relative flex items-center justify-center overflow-hidden bg-[#e8ecf1]"
                      style={{ minHeight: 'min(46vh, 380px)', height: 'min(60vh, 600px)' }}
                    >
                      <HudViewportChrome />
                      <img
                        src={spotlightMeta!.imgUrl}
                        alt={spotlightMeta!.reg}
                        className="relative z-[2] max-h-full max-w-full object-contain px-4 py-5 sm:px-8 sm:py-6 transition-[filter] duration-300 group-hover:brightness-[1.02]"
                        referrerPolicy="no-referrer"
                        decoding="async"
                      />
                    </div>
                    <div
                      className="relative z-10 border-t px-4 sm:px-6 py-4 text-left bg-white"
                      style={{ borderColor: '#f1f5f9' }}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: '#059669' }}>
                        Registration lock
                      </div>
                      <div
                        className="text-2xl sm:text-3xl font-bold tracking-tight font-mono mb-2"
                        style={{ color: '#0f766e', letterSpacing: '0.04em' }}
                      >
                        {spotlightMeta!.reg}
                      </div>
                      <div className="text-xs sm:text-sm font-mono leading-relaxed" style={{ color: '#475569' }}>
                        <span className="text-emerald-600/70 mr-2">OPR</span>
                        {spotlightMeta!.op || '—'}
                        {spotlightMeta!.ap ? (
                          <>
                            <span className="mx-2 text-slate-300">│</span>
                            <span className="text-amber-700/80 mr-2">ARP</span>
                            <span className="text-amber-800 font-medium">{spotlightMeta!.ap}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        <ExternalLink className="w-3 h-3" />
                        <span>Open full record</span>
                      </div>
                    </div>
                  </button>
                  <div
                    className="flex items-center justify-between px-4 sm:px-6 py-3 border-t font-mono text-[11px] bg-[#fafafa]"
                    style={{ borderColor: '#f1f5f9', color: '#64748b' }}
                  >
                    <div className="flex items-center gap-5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600/60">V</span>
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {(spotlight.view_count || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-600/60">♥</span>
                        <Heart className="w-3.5 h-3.5 text-slate-400" />
                        {spotlight.like_count || 0}
                      </span>
                    </div>
                    {spotlight.category && (
                      <span className="uppercase tracking-[0.12em] text-amber-800/70">
                        {String(spotlight.category).replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </motion.div>
              </div>

              <aside className="lg:col-span-5 xl:col-span-4 order-2 lg:max-h-[min(72vh,680px)] lg:flex lg:flex-col">
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2 font-mono text-slate-500"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
                  Buffer list · {filteredPhotos.length} tracks
                </div>
                <ul className="space-y-2 lg:overflow-y-auto lg:pr-1 no-scrollbar lg:flex-1 lg:min-h-0">
                  {(filteredPhotos as FeaturedPhoto[]).map((p, idx) => {
                    const { reg, op, ap, imgUrl } = photoMeta(p);
                    const active = p.id === spotlight.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setSpotlightId(p.id)}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 font-mono bg-white"
                          style={{
                            borderColor: active ? '#6ee7b7' : '#e2e8f0',
                            boxShadow: active ? 'inset 3px 0 0 #10b981' : 'none',
                            background: active ? '#f0fdf4' : '#fff',
                          }}
                        >
                          <div
                            className="relative w-[4.25rem] h-[4.25rem] shrink-0 overflow-hidden rounded-lg border bg-slate-100"
                            style={{ borderColor: active ? '#a7f3d0' : '#e2e8f0' }}
                          >
                            <img
                              src={imgUrl}
                              alt=""
                              loading={idx > 4 ? 'lazy' : 'eager'}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="text-[10px] uppercase tracking-wider mb-0.5 text-emerald-700/60">
                              ID
                            </div>
                            <div className={`text-sm font-bold truncate ${active ? 'text-emerald-900' : 'text-slate-900'}`}>
                              {reg}
                            </div>
                            <div className="text-[11px] truncate mt-1 leading-snug text-slate-600">
                              {op || '—'}
                              {ap ? <span className="text-amber-800"> · {ap}</span> : null}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                              <Eye className="w-3 h-3" />
                              {(p.view_count || 0).toLocaleString()}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            </div>
          ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* LATEST + FEATURES */}
      <section style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Latest uploads */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="live-dot" />
              <h2 className="font-headline text-lg font-bold" style={{ color: '#0f172a' }}>Latest uploads</h2>
            </div>
            {latest.length === 0 ? (
              <p className="text-xs" style={{ color: '#94a3b8' }}>No recent uploads.</p>
            ) : (
              <div className="space-y-2">
                {latest.map((item, i) => {
                  const reg = (item.aircraft as any)?.registration || '?';
                  const op = (item.operator as any)?.name || '';
                  const ap = (item.airport as any)?.iata || '';
                  const imgUrl = proxyImageUrl(item.storage_path || '');
                  const ago = item.created_at ? getTimeAgo(item.created_at) : '';
                  return (
                    <motion.button key={item.id}
                      type="button"
                      onClick={() => onPhotoClick?.(item.id)}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card w-full text-left flex items-center gap-3 p-3 cursor-pointer">
                      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                        <img src={imgUrl} alt={reg} className="w-full h-full object-cover" referrerPolicy="no-referrer" style={{ background: '#f1f5f9' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{reg}</div>
                        <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{op}{ap ? ` · ${ap}` : ''}</div>
                      </div>
                      <div className="text-xs shrink-0 flex items-center gap-1" style={{ color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>
                        <Clock className="w-3 h-3" />{ago}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Feature cards + top spotters */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {[
              { icon: TrendingUp, title: 'Fleet Analytics', desc: 'Browse airline fleet compositions grouped by manufacturer and aircraft family.', page: 'fleet' as Page },
              { icon: MapPin, title: 'Airport Map', desc: 'Interactive map with spotting airports worldwide.', page: 'map' as Page },
            ].map(block => {
              const Icon = block.icon;
              return (
                <div key={block.title} className="card p-6 cursor-pointer group" onClick={() => setCurrentPage(block.page)}>
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

            {topSpotters.length > 0 && (
              <div className="card md:col-span-2 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-headline text-base font-bold" style={{ color: '#0f172a' }}>Top Spotters</h4>
                  <button onClick={() => setCurrentPage('stats')} className="text-sm font-medium transition-colors" style={{ color: '#0ea5e9' }}>View all →</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {topSpotters.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-xs w-4 text-right" style={{ color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace' }}>{i + 1}</span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: '#0f172a', color: '#fff', fontSize: 10 }}>
                        {(s.display_name || s.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{s.display_name || s.username}</div>
                        <div className="text-xs" style={{ color: '#94a3b8' }}>{(s.approved_uploads || 0).toLocaleString()} photos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center" style={{ background: '#fff' }}>
        <div className="max-w-lg mx-auto">
          <h2 className="font-headline text-3xl font-bold mb-4" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>
            Start contributing today.
          </h2>
          <p className="text-base mb-8" style={{ color: '#475569' }}>
            Join the SILKSPOT community and help build the most accurate aviation spotting database.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setCurrentPage('upload')} className="btn-primary" style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Upload a photo</button>
            <button onClick={() => setCurrentPage('fleet')} className="btn-secondary" style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Browse fleet database</button>
          </div>
        </div>
      </section>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
