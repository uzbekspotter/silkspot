import { motion, AnimatePresence } from 'motion/react';
import { Camera, Eye, Heart, Plane, MapPin, Calendar, Award, Globe2, UserPlus, Settings, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { proxyImageUrl } from '../lib/storage';
import { PhotoStarRating } from './PhotoStarRating';

type Tab = 'Photos' | 'Stats' | 'Achievements';
type PhotoFilter = 'All' | 'Featured' | 'Takeoff' | 'Landing' | 'Static' | 'Night' | 'Airport';

const PHOTO_FILTERS: PhotoFilter[] = ['All', 'Featured', 'Takeoff', 'Landing', 'Static', 'Night', 'Airport'];

const RANK_THRESHOLDS = [
  { rank: 'Observer',    min: 0 },
  { rank: 'Reporter',    min: 10 },
  { rank: 'Contributor', min: 50 },
  { rank: 'Spotter',     min: 200 },
  { rank: 'Senior',      min: 500 },
  { rank: 'Expert',      min: 1000 },
  { rank: 'Master',      min: 2500 },
  { rank: 'Legend',       min: 5000 },
];

const RANKS = RANK_THRESHOLDS.map(r => r.rank);

export const ProfilePage = ({
  onPhotoClick,
  onNavigate,
  profileUserId,
}: {
  onPhotoClick?: (id: string) => void;
  onNavigate?: (page: 'settings') => void;
  profileUserId?: string | null;
}) => {
  const [tab, setTab] = useState<Tab>('Photos');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('All');
  const [following, setFollowing] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);
  const TABS: Tab[] = ['Photos', 'Stats', 'Achievements'];

  useEffect(() => { loadProfile(); }, [profileUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      const targetUserId = profileUserId || user.id;

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          ha:airports!home_airport_id(iata)
        `)
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      setProfile(data);
      const { data: photos } = await supabase
        .from('photos')
        .select(`
          id, storage_path, shot_date, category, like_count, view_count, rating_sum, rating_count, is_featured, status, created_at,
          aircraft(registration),
          operator:airlines(name, iata),
          airport:airports(iata)
        `)
        .eq('uploader_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(200);
      setUserPhotos(photos ?? []);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = useMemo(() => userPhotos.filter(p => p.status === 'PENDING').length, [userPhotos]);

  // Derived stats from actual photo data (pending rows are included in "All", sorted first — no separate filter)
  const filteredPhotos = useMemo(() => {
    const sortGallery = (list: typeof userPhotos) =>
      [...list].sort((a, b) => {
        const pa = a.status === 'PENDING' ? 0 : 1;
        const pb = b.status === 'PENDING' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    if (photoFilter === 'All') return sortGallery(userPhotos);
    if (photoFilter === 'Featured') return sortGallery(userPhotos.filter(p => p.is_featured));
    if (photoFilter === 'Airport') return sortGallery(userPhotos.filter(p => String(p.category || '').startsWith('AIRPORT_')));
    return sortGallery(userPhotos.filter(p => p.category?.toLowerCase() === photoFilter.toLowerCase()));
  }, [userPhotos, photoFilter]);

  const topAirlines = useMemo(() => {
    const counts: Record<string, { name: string; iata: string; count: number }> = {};
    for (const p of userPhotos) {
      const name = (p.operator as any)?.name;
      const iata = (p.operator as any)?.iata || '';
      if (!name) continue;
      if (!counts[name]) counts[name] = { name, iata, count: 0 };
      counts[name].count++;
    }
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
    const max = sorted[0]?.count || 1;
    return sorted.map(a => ({ ...a, pct: Math.round((a.count / max) * 100) }));
  }, [userPhotos]);

  const monthlyUploads = useMemo(() => {
    const months = Array(12).fill(0);
    const now = new Date();
    for (const p of userPhotos) {
      const d = new Date(p.created_at);
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff >= 0 && diff < 12) months[11 - diff]++;
    }
    return months;
  }, [userPhotos]);

  const maxM = Math.max(...monthlyUploads, 1);

  const quickVitals = useMemo(() => {
    const bestMonth = Math.max(...monthlyUploads);
    const avgMonth = monthlyUploads.length ? Math.round(monthlyUploads.reduce((a, b) => a + b, 0) / 12) : 0;
    const approved = userPhotos.filter(p => p.status === 'APPROVED').length;
    const total = userPhotos.length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    return [
      { label: 'Best month', val: String(bestMonth), sub: 'uploads' },
      { label: 'Avg/month', val: String(avgMonth), sub: 'over 12mo' },
      { label: 'Approval', val: total > 0 ? `${approvalRate}%` : '—', sub: 'all-time' },
      { label: 'Total uploads', val: String(total), sub: 'all statuses' },
    ];
  }, [userPhotos, monthlyUploads]);

  const achievements = useMemo(() => {
    // Achievements reflect all approved photos in the gallery, not the rank ladder counter
    // (self-approved test shots do not advance rank but still count as published work).
    const approvedGallery = userPhotos.filter(p => p.status === 'APPROVED').length;
    const countries = profile?.countries_visited || 0;
    const airports = profile?.airports_visited || 0;
    return [
      { icon: Camera, bg: '#fef3c7', color: '#d97706', label: 'First Upload', sub: 'Upload your first photo', unlocked: approvedGallery >= 1 },
      { icon: Award, bg: '#dbeafe', color: '#2563eb', label: '50 Club', sub: '50+ approved photos', unlocked: approvedGallery >= 50 },
      { icon: Award, bg: '#fef3c7', color: '#d97706', label: '100 Club', sub: '100+ approved photos', unlocked: approvedGallery >= 100 },
      { icon: Award, bg: '#dcfce7', color: '#16a34a', label: '500 Club', sub: '500+ approved photos', unlocked: approvedGallery >= 500 },
      { icon: Award, bg: '#fce7f3', color: '#db2777', label: '1K Club', sub: '1,000+ approved photos', unlocked: approvedGallery >= 1000 },
      { icon: Globe2, bg: '#fef3c7', color: '#d97706', label: 'Globe Trotter', sub: 'Photos from 5+ countries', unlocked: countries >= 5 },
      { icon: MapPin, bg: '#ede9fe', color: '#7c3aed', label: 'Airport Hopper', sub: 'Photos from 10+ airports', unlocked: airports >= 10 },
      { icon: Plane, bg: '#f8fafc', color: '#94a3b8', label: 'Legend', sub: '5,000+ approved photos', unlocked: approvedGallery >= 5000 },
    ];
  }, [profile, userPhotos]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#94a3b8' }} />
          <p style={{ color: '#94a3b8' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#94a3b8' }}>Profile not found</p>
      </div>
    );
  }

  const homeFromFk = (profile as { ha?: { iata?: string | null } | null }).ha?.iata;
  const homeAirportCode =
    String(profile.home_airport_iata || '').trim().toUpperCase() ||
    String(homeFromFk || '').trim().toUpperCase() ||
    '';

  const spotter = {
    name: profile.display_name || profile.username,
    username: '@' + profile.username,
    avatar: (profile.display_name || profile.username).substring(0, 2).toUpperCase(),
    avatarUrl: profile.avatar_url || '',
    location: profile.location || '',
    homeAirport: homeAirportCode || null,
    joinedDate: new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    rank: profile.rank || 'Observer',
    bio: profile.bio || '',
    coverUrl: profile.cover_url || '',
    isOwn: !profileUserId || profileUserId === profile.id,
    followers: profile.follower_count || 0,
    following: profile.following_count || 0,
  };

  const uploads = profile.approved_uploads || 0;
  const curRankIdx = Math.max(0, RANK_THRESHOLDS.findIndex(r => r.rank === spotter.rank));
  const nextRank = curRankIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[curRankIdx + 1] : null;
  const rankPct = nextRank ? Math.min(100, Math.round((uploads / nextRank.min) * 100)) : 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      {/* Cover */}
      <section className="relative">
        <div className="relative overflow-hidden" style={{ height: 240 }}>
          {spotter.coverUrl ? (
            <img src={spotter.coverUrl} className="w-full h-full object-cover" style={{ opacity: 0.5 }} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom,transparent 40%,#fff 100%)' }} />
        </div>

        <div className="site-w relative z-10" style={{ marginTop: '-3.5rem' }}>
          <div
            className="rounded-t-2xl bg-white pt-6 pb-8"
            style={{
              borderBottom: '1px solid #f5f5f7',
              boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.1)',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-5 md:gap-8">
            <div className="flex justify-center md:justify-start shrink-0 -mt-10 md:-mt-[4.25rem]">
            {spotter.avatarUrl ? (
              <img src={proxyImageUrl(spotter.avatarUrl)} alt={spotter.name}
                className="w-24 h-24 rounded-2xl object-cover shrink-0"
                referrerPolicy="no-referrer"
                style={{ border: '4px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }} />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-3xl shrink-0"
                style={{ background: '#0f172a', color: '#fff', border: '4px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
                {spotter.avatar}
              </div>
            )}
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex items-center gap-3 mb-1 flex-wrap justify-center md:justify-start">
                <h1 className="font-headline text-3xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{spotter.name}</h1>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#f1f5f9', color: '#334155' }}>{spotter.rank}</span>
              </div>
              <div className="mt-2 space-y-2.5">
                <div
                  className="text-sm font-medium"
                  style={{ color: '#1e293b', fontFamily: '"SF Mono",monospace', letterSpacing: '0.02em' }}
                >
                  {spotter.username}
                </div>
                <div
                  className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-sm"
                  style={{ color: '#1e293b' }}
                >
                  {spotter.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
                      {spotter.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
                    Joined {spotter.joinedDate}
                  </span>
                  {spotter.homeAirport && (
                    <span className="flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
                      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>Home airport</span>
                      <span style={{ fontFamily: '"SF Mono",monospace', fontWeight: 600, letterSpacing: '0.06em' }}>{spotter.homeAirport}</span>
                    </span>
                  )}
                </div>
              </div>
              {spotter.bio && <p className="text-sm mt-3" style={{ color: '#334155', maxWidth: 480, lineHeight: 1.55 }}>{spotter.bio}</p>}
            </div>
            <div className="flex flex-col items-center md:items-end gap-4 shrink-0 md:pt-1">
              <div className="flex items-center gap-6">
                {[{ val: spotter.followers.toLocaleString('en-US'), label: 'Followers' }, { val: spotter.following.toLocaleString('en-US'), label: 'Following' }].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-base font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{s.val}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {spotter.isOwn ? (
                  <button onClick={() => onNavigate?.('settings')} className="btn-outline" style={{ height: 34, padding: '0 16px', fontSize: 12, gap: 6 }}><Settings className="w-3.5 h-3.5" />Edit Profile</button>
                ) : (
                  <button onClick={() => setFollowing(f => !f)}
                    className={following ? 'btn-outline' : 'btn-primary'}
                    style={{ height: 34, padding: '0 16px', fontSize: 12, gap: 6 }}>
                    <UserPlus className="w-3.5 h-3.5" />{following ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w">
          <div className="flex items-stretch overflow-x-auto no-scrollbar">
            {[
              { label: 'Photos', value: userPhotos.length, icon: Camera },
              { label: 'Approved', value: userPhotos.filter(p => p.status === 'APPROVED').length, icon: CheckCircle2 },
              ...(pendingCount > 0 ? [{ label: 'In review', value: pendingCount, icon: Clock } as const] : []),
              { label: 'Views', value: (profile.total_views || 0), icon: Eye },
              { label: 'Likes', value: (profile.total_likes || 0), icon: Heart },
            ].map((s, i, arr) => { const Icon = s.icon; return (
              <div key={s.label} className="flex items-center gap-2.5 px-7 py-4 shrink-0"
                style={{ borderRight: i < arr.length - 1 ? '1px solid #e8e8ed' : 'none' }}>
                <Icon className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                <span className="text-sm font-semibold mr-1" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{s.value.toLocaleString()}</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>{s.label}</span>
              </div>
            ); })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 52, zIndex: 40 }}>
        <div className="site-w flex">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-sm px-6 py-4 transition-all"
              style={{ color: tab === t ? '#0f172a' : '#475569', borderBottom: tab === t ? '2px solid #0f172a' : '2px solid transparent', fontWeight: tab === t ? 500 : 400 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="site-w py-10">
        <AnimatePresence mode="wait">

          {/* PHOTOS */}
          {tab === 'Photos' && (
            <motion.div key="photos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {PHOTO_FILTERS.map(f => (
                    <button key={f} onClick={() => setPhotoFilter(f)}
                      className="btn-outline" style={{
                        height: 32, padding: '0 14px', fontSize: 12,
                        background: photoFilter === f ? '#0f172a' : undefined,
                        color: photoFilter === f ? '#fff' : undefined,
                        borderColor: photoFilter === f ? '#0f172a' : undefined,
                      }}>{f}</button>
                  ))}
                </div>
                <span className="text-sm" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>{filteredPhotos.length} photos</span>
              </div>
              {filteredPhotos.length === 0 ? (
                <div className="text-center py-16">
                  <Camera className="w-12 h-12 mx-auto mb-4" style={{ color: '#e2e8f0' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>
                    {photoFilter === 'All' ? 'No photos yet' : `No ${photoFilter.toLowerCase()} photos`}
                  </p>
                  <p className="text-xs" style={{ color: '#94a3b8' }}>
                    {photoFilter === 'All' ? 'Start uploading your spotting photos to build your gallery.' : 'Try a different filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPhotos.map((p, i) => {
                    const cat = String(p.category || '');
                    const airportScene = cat.startsWith('AIRPORT_');
                    const sceneLabel = airportScene
                      ? cat.replace(/^AIRPORT_/, '').replace(/_/g, ' ').toLowerCase()
                      : '';
                    const reg = airportScene
                      ? ((p.airport as { iata?: string })?.iata ? `${(p.airport as { iata?: string }).iata} · ${sceneLabel}` : sceneLabel || 'Airport')
                      : (p.aircraft as { registration?: string })?.registration || '?';
                    const op = (p.operator as any)?.name || '';
                    const ap = (p.airport as any)?.iata || '';
                    const imgUrl = proxyImageUrl(p.storage_path || '');
                    return (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                        className={`card cursor-pointer group overflow-hidden ${i === 0 ? 'md:col-span-2' : ''}`}
                        onClick={() => onPhotoClick?.(p.id)}>
                        <div className={`relative overflow-hidden ${i === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} style={{ borderRadius: '18px 18px 0 0' }}>
                          <img src={imgUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            referrerPolicy="no-referrer" style={{ background: '#f1f5f9' }} />
                          <div className="photo-overlay absolute inset-0" />
                          {p.is_featured && <div className="absolute top-3 left-3"><span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: '#d97706' }}>Featured</span></div>}
                          {p.status === 'PENDING' && <div className="absolute top-3 right-3"><span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(217,119,6,0.9)', color: '#fff' }}>Pending</span></div>}
                          {p.status === 'REJECTED' && <div className="absolute top-3 right-3"><span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(220,38,38,0.9)', color: '#fff' }}>Rejected</span></div>}
                          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                            <div className="text-sm font-semibold" style={{ color: '#fff' }}>{reg}</div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                              {op}{op && ap ? ' · ' : ''}{ap && <span className="tag" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', border: 'none' }}>{ap}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: '"SF Mono",monospace' }}>
                              <Eye className="w-3 h-3 shrink-0" />
                              <span>{(p.view_count || 0).toLocaleString()}</span>
                            </div>
                            <div onClick={e => e.stopPropagation()}>
                              <PhotoStarRating
                                photoId={p.id}
                                ratingSum={(p as { rating_sum?: number }).rating_sum ?? 0}
                                ratingCount={(p as { rating_count?: number }).rating_count ?? 0}
                                compact
                                variant="onDark"
                                onAggregatesChange={(sum, cnt) => {
                                  setUserPhotos(prev =>
                                    prev.map(x => (x.id === p.id ? { ...x, rating_sum: sum, rating_count: cnt } : x)),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* STATS */}
          {tab === 'Stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-7 space-y-6">
                {/* Monthly uploads chart */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-6" style={{ color: '#0f172a' }}>Monthly Uploads — Last 12 months</h3>
                  <div className="flex items-end gap-2" style={{ height: 120 }}>
                    {monthlyUploads.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(v / maxM) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.5 }}
                          className="w-full rounded-t-sm" style={{ background: v === maxM ? '#0f172a' : '#e2e8f0', minHeight: v > 0 ? 4 : 1 }} />
                        <span className="text-xs" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace', fontSize: 10 }}>{v || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top airlines from actual data */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: '#0f172a' }}>Top Airlines</h3>
                  {topAirlines.length === 0 ? (
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Upload photos to see your airline stats.</p>
                  ) : (
                    <div className="space-y-4">
                      {topAirlines.map((a, i) => (
                        <div key={a.name}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              {a.iata && <span className="tag">{a.iata}</span>}
                              <span className="text-sm" style={{ color: '#0f172a' }}>{a.name}</span>
                            </div>
                            <span className="text-sm" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>{a.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#f8fafc' }}>
                            <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }} style={{ background: '#0f172a' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="xl:col-span-5 space-y-6">
                {/* Rank progress */}
                <div className="card-gray p-6 rounded-2xl">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: '#0f172a' }}>Rank Progress</h3>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <Award className="w-6 h-6" style={{ color: '#0f172a' }} />
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#0f172a' }}>{spotter.rank}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>Level {curRankIdx + 1} of {RANKS.length}</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    {RANKS.map((r, i) => { const cur = i === curRankIdx, done = i < curRankIdx; return (
                      <div key={r} className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: cur ? '#0f172a' : done ? '#e2e8f0' : '#f8fafc', border: `1.5px solid ${cur ? '#0f172a' : done ? '#e2e8f0' : '#f1f5f9'}` }}>
                          {done && <CheckCircle2 className="w-2 h-2 text-white" />}
                        </div>
                        <span className="text-xs" style={{ color: cur ? '#0f172a' : done ? '#94a3b8' : '#e2e8f0', fontWeight: cur ? 500 : 400 }}>{r}</span>
                        {cur && <span className="ml-auto text-xs" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>you</span>}
                      </div>
                    ); })}
                  </div>
                  {nextRank && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: '#94a3b8' }}>
                        <span>To {nextRank.rank}</span>
                        <span style={{ fontFamily: '"SF Mono",monospace' }}>{uploads.toLocaleString()} / {nextRank.min.toLocaleString()}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: '#f1f5f9' }}>
                        <div className="h-2 rounded-full" style={{ width: `${rankPct}%`, background: '#0f172a' }} />
                      </div>
                    </div>
                  )}
                </div>
                {/* Quick vitals — real data */}
                <div className="grid grid-cols-2 gap-3">
                  {quickVitals.map(v => (
                    <div key={v.label} className="card p-4">
                      <div className="text-xs mb-1" style={{ color: '#94a3b8' }}>{v.label}</div>
                      <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{v.val}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#cbd5e1' }}>{v.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ACHIEVEMENTS */}
          {tab === 'Achievements' && (
            <motion.div key="ach" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-headline text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>Achievements</h2>
                <span className="text-sm" style={{ color: '#94a3b8' }}>{achievements.filter(a => a.unlocked).length} of {achievements.length} unlocked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {achievements.map((ach, i) => { const Icon = ach.icon; return (
                  <motion.div key={ach.label} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    className="card p-5" style={{ opacity: ach.unlocked ? 1 : 0.5 }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: ach.bg }}>
                      <Icon className="w-5 h-5" style={{ color: ach.color }} />
                    </div>
                    <div className="font-semibold mb-1 text-sm" style={{ color: '#0f172a' }}>{ach.label}</div>
                    <div className="text-xs leading-relaxed mb-3" style={{ color: '#94a3b8' }}>{ach.sub}</div>
                    {ach.unlocked && <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16a34a' }}><CheckCircle2 className="w-3 h-3" />Unlocked</div>}
                  </motion.div>
                ); })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
