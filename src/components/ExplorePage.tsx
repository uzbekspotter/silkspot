import { motion } from 'motion/react';
import { Eye, Heart, Camera, Plane, MapPin, TrendingUp, Users, Globe2, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Page } from '../types';
import React from 'react';
import { supabase } from '../lib/supabase';
import { proxyImageUrl } from '../lib/storage';

const FILTERS = ['All', 'Takeoff', 'Landing', 'Static', 'Night'];

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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [photosRes, latestRes, usersCount, spottersRes] = await Promise.all([
        supabase.from('photos')
          .select(`id, storage_path, status, category, view_count, like_count, aircraft(registration), operator:airlines(name), airport:airports(iata)`)
          .eq('status', 'APPROVED')
          .order('view_count', { ascending: false })
          .limit(8),
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

  const filteredPhotos = filter === 'All'
    ? photos
    : photos.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }} className="page-shell">

      {/* HERO — compact strip (JetPhotos / Planespotters style: content first, minimal banner) */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid #e2e8f0' }}>

        <div className="absolute inset-x-0 top-0 h-32 md:h-40 overflow-hidden pointer-events-none" aria-hidden="true">
        <svg className="absolute left-0 right-0 bottom-0 w-full h-[200%] min-h-[220px]" viewBox="0 0 1440 460"
          preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9dff0" />
              <stop offset="50%" stopColor="#f0d9b5" />
              <stop offset="100%" stopColor="#e8c48a" />
            </linearGradient>
            <linearGradient id="gSand1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#deb887" />
              <stop offset="100%" stopColor="#c8955a" />
            </linearGradient>
            <linearGradient id="gSand2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8a06a" />
              <stop offset="100%" stopColor="#a0784a" />
            </linearGradient>
            <linearGradient id="gTrail" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="gTrail2" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
            </linearGradient>
            <filter id="fBlur3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" /></filter>
            <filter id="fBlur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
          </defs>
          <rect width="1440" height="460" fill="url(#gSky)" />
          <ellipse cx="1100" cy="340" rx="220" ry="80" fill="#ffe4a0" opacity="0.45" filter="url(#fBlur6)" />
          <g transform="translate(1080, 62) rotate(-28)" fill="#2d3e50" opacity="0.72">
            <path d="M 120,0 C 115,-5 100,-7 80,-7 L -90,-7 C -105,-7 -118,-4 -124,0 C -118,4 -105,7 -90,7 L 80,7 C 100,7 115,5 120,0 Z" />
            <path d="M 120,0 C 135,-2 148,-1 155,0 C 148,1 135,2 120,0 Z" />
            <path d="M 30,-7 L 20,-7 L -55,-90 C -58,-95 -52,-98 -48,-93 L 25,-15 L 35,-7 Z" />
            <path d="M 30,7 L 20,7 L -55,90 C -58,95 -52,98 -48,93 L 25,15 L 35,7 Z" />
            <ellipse cx="-10" cy="-52" rx="18" ry="8" />
            <ellipse cx="-10" cy="52" rx="18" ry="8" />
            <path d="M -100,-7 L -108,-7 L -130,-30 C -133,-33 -129,-36 -126,-33 L -105,-10 L -98,-7 Z" />
            <path d="M -100,7 L -108,7 L -130,30 C -133,33 -129,36 -126,33 L -105,10 L -98,7 Z" />
            <path d="M -90,0 L -95,-5 L -125,-42 C -127,-46 -122,-48 -120,-44 L -92,5 Z" />
          </g>
          <path d="M 220,380 Q 520,280 830,165 Q 990,108 1072,70" stroke="url(#gTrail)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.8" filter="url(#fBlur3)" />
          <path d="M 232,385 Q 532,286 842,171 Q 1002,114 1084,76" stroke="url(#gTrail2)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" filter="url(#fBlur3)" />
          <path d="M 0,360 Q 180,332 380,352 Q 580,372 780,345 Q 980,318 1160,342 Q 1320,362 1440,348 L 1440,460 L 0,460 Z" fill="#c8955a" opacity="0.45" />
          <path d="M 0,390 Q 260,358 520,378 Q 780,398 1000,368 Q 1200,340 1440,370 L 1440,460 L 0,460 Z" fill="url(#gSand1)" opacity="0.7" />
          <path d="M 0,415 Q 360,400 720,412 Q 1080,424 1440,408 L 1440,460 L 0,460 Z" fill="url(#gSand2)" opacity="0.9" />
        </svg>
        </div>

        <div className="absolute inset-x-0 top-0 h-32 md:h-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0.96) 100%)' }} />
        <div className="relative z-10 site-w py-8 md:py-10">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8">
            <div className="text-center md:text-left min-w-0">
              <h1 className="font-headline text-3xl md:text-4xl font-bold mb-2 md:mb-1.5" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>SILKSPOT</h1>
              <p className="text-sm md:text-base mx-auto md:mx-0" style={{ color: '#64748b', maxWidth: 520, fontWeight: 400, lineHeight: 1.5 }}>
                Every photo tagged with registration, operator history, technical specs, and fleet metadata.
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2.5 shrink-0">
              <button onClick={() => setCurrentPage('upload')} className="btn-primary" style={{ height: 40, padding: '0 20px', fontSize: 13 }}>Upload a photo</button>
              <button onClick={() => setCurrentPage('fleet')} className="btn-secondary" style={{ height: 40, padding: '0 20px', fontSize: 13 }}>Browse fleet</button>
            </div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <div className="site-w">
            <div className="flex items-stretch overflow-x-auto no-scrollbar">
              {[
                { label: 'Spotters', value: stats.users.toLocaleString(), icon: Users },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 shrink-0">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
                    <div>
                      <span className="text-base font-semibold mr-1.5" style={{ color: '#0f172a', fontFamily: '"B612 Mono", monospace' }}>{s.value}</span>
                      <span className="text-sm" style={{ color: '#94a3b8' }}>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TRENDING / PHOTOS */}
      <section className="site-w py-14">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 className="font-headline text-2xl font-bold" style={{ color: '#0f172a' }}>
            {filteredPhotos.length > 0 ? 'Featured Photos' : 'Recent Photos'}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-sm px-3 py-1.5 transition-all"
                style={{
                  background: filter === f ? '#0f172a' : '#fff',
                  color: filter === f ? '#fff' : '#64748b',
                  border: '1px solid ' + (filter === f ? '#0f172a' : '#e2e8f0'),
                  borderRadius: 6,
                  fontWeight: filter === f ? 500 : 400,
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#94a3b8' }} />
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 mx-auto mb-4" style={{ color: '#e2e8f0' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>No photos yet</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Be the first to upload a photo!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredPhotos.map((p, i) => {
              const reg = (p.aircraft as any)?.registration || '?';
              const op = (p.operator as any)?.name || '';
              const ap = (p.airport as any)?.iata || '';
              const imgUrl = proxyImageUrl(p.storage_path || '');
              return (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="card cursor-pointer group overflow-hidden"
                  onClick={() => onPhotoClick?.(p.id)}>
                  <div className="aspect-[4/3] relative overflow-hidden" style={{ borderRadius: '9px 9px 0 0' }}>
                    <img src={imgUrl} alt={reg}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      referrerPolicy="no-referrer" style={{ background: '#f1f5f9' }} />
                    <div className="photo-overlay absolute inset-0" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="text-sm font-semibold mb-0.5" style={{ color: '#fff' }}>{reg}</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{op}{op && ap ? ' · ' : ''}{ap}</div>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{(p.view_count || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.like_count || 0}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

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
                    <motion.div key={item.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card flex items-center gap-3 p-3">
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
                    </motion.div>
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
