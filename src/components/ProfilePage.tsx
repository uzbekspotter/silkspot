import { motion, AnimatePresence } from 'motion/react';
import { Camera, Eye, Heart, Plane, MapPin, Calendar, Award, Globe2, UserPlus, Settings, CheckCircle2, Check, Loader2, Clock, Home, ExternalLink, Link2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { proxyAvatarUrl, proxyImageUrl } from '../lib/storage';
import { PhotoStarRating } from './PhotoStarRating';
import { isAirportGalleryEntry } from '../lib/photo-gallery-filter';
import { parseSpotterLinks, spotterLinkHost, spotterLinkStyle } from '../lib/spotter-links';
import { galleryFrameClass } from '../lib/gallery-aspect';

type Tab = 'Photos' | 'Stats' | 'Achievements' | 'Links';
type PhotoFilter = 'All' | 'Featured' | 'Takeoff' | 'Landing' | 'Static' | 'Night' | 'Airport';

const PHOTO_FILTERS: PhotoFilter[] = ['All', 'Featured', 'Takeoff', 'Landing', 'Static', 'Night', 'Airport'];

const RANK_THRESHOLDS = [
  { rank: 'Observer',    min: 0 },
  { rank: 'Reporter',    min: 10 },
  { rank: 'Contributor', min: 50 },
  { rank: 'Spotter',     min: 200 },
  { rank: 'Senior',      min: 500 },
  { rank: 'Expert',      min: 1000 },
  { rank: 'Legend',      min: 2500 },
];

const RANKS = RANK_THRESHOLDS.map(r => r.rank);

export const ProfilePage = ({
  onPhotoClick,
  onNavigate,
  profileUserId,
  viewerUserId,
  onRequireLogin,
  onOpenMapAirport,
}: {
  onPhotoClick?: (id: string) => void;
  onNavigate?: (page: 'settings') => void;
  profileUserId?: string | null;
  /** Logged-in viewer; null for guests (public profile view). */
  viewerUserId?: string | null;
  onRequireLogin?: () => void;
  /** IATA or ICAO — map focuses that airport */
  onOpenMapAirport?: (airportCode: string) => void;
}) => {
  const [tab, setTab] = useState<Tab>('Photos');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('All');
  const [following, setFollowing] = useState(false);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPhotos, setUserPhotos] = useState<any[]>([]);
  const TABS: Tab[] = ['Photos', 'Stats', 'Achievements', 'Links'];

  useEffect(() => { loadProfile(); }, [profileUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      const targetUserId = (profileUserId?.trim() || user?.id || '').trim();
      if (!targetUserId) {
        setProfile(null);
        setUserPhotos([]);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          ha:airports!home_airport_id(iata, icao)
        `)
        .eq('id', targetUserId)
        .single();

      if (error) throw error;

      setProfile(data);
      const { data: photos } = await supabase
        .from('photos')
        .select(`
          id, storage_path, shot_date, category, like_count, view_count, rating_sum, rating_count, is_featured, status, created_at,
          width_px, height_px,
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
    if (photoFilter === 'Airport') return sortGallery(userPhotos.filter(p => isAirportGalleryEntry(p)));
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

  const monthLabels = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const x = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      out.push(x.toLocaleDateString('en-US', { month: 'short' }));
    }
    return out;
  }, []);

  /** Approved photos only — category distribution */
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of userPhotos) {
      if (p.status !== 'APPROVED') continue;
      const c = String(p.category || '—');
      counts[c] = (counts[c] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = entries[0]?.[1] || 1;
    return entries.map(([label, count]) => ({
      label: label.length > 28 ? `${label.slice(0, 26)}…` : label,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }, [userPhotos]);

  const topAirports = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of userPhotos) {
      const code = (p.airport as { iata?: string })?.iata;
      if (!code) continue;
      counts[code] = (counts[code] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([iata, count]) => ({ iata, count }));
    const max = sorted[0]?.count || 1;
    return sorted.map(a => ({ ...a, pct: Math.round((a.count / max) * 100) }));
  }, [userPhotos]);

  const engagementTotals = useMemo(() => {
    const approved = userPhotos.filter(p => p.status === 'APPROVED');
    const n = approved.length;
    const totalViews = approved.reduce((s, p) => s + (Number(p.view_count) || 0), 0);
    const totalLikes = approved.reduce((s, p) => s + (Number(p.like_count) || 0), 0);
    return {
      n,
      totalViews,
      totalLikes,
      avgViews: n > 0 ? Math.round(totalViews / n) : 0,
      avgLikes: n > 0 ? Math.round((totalLikes / n) * 10) / 10 : 0,
    };
  }, [userPhotos]);

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

  const spotterLinks = useMemo(() => parseSpotterLinks(profile?.spotter_links), [profile?.spotter_links]);

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
      { icon: MapPin, bg: '#ede9fe', color: '#7c3aed', label: 'Airport Hopper', sub: 'Photos from 20+ airports', unlocked: airports >= 20 },
      { icon: Plane, bg: '#f8fafc', color: '#94a3b8', label: 'Legend', sub: '2,500+ approved photos', unlocked: approvedGallery >= 2500 },
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

  const haRow = (profile as { ha?: { iata?: string | null; icao?: string | null } | null }).ha;
  const homeIata = String(profile.home_airport_iata || haRow?.iata || '').trim().toUpperCase() || null;
  const homeIcao = String(haRow?.icao || '').trim().toUpperCase() || null;
  const homeAirportLabel = homeIata && homeIcao ? `${homeIata}/${homeIcao}` : homeIata || homeIcao || null;
  const homeMapCode = homeIata || homeIcao || null;

  const spotter = {
    name: profile.display_name || profile.username,
    username: '@' + profile.username,
    avatar: (profile.display_name || profile.username).substring(0, 2).toUpperCase(),
    avatarUrl: profile.avatar_url || '',
    location: profile.location || '',
    homeAirportLabel,
    homeMapCode,
    joinedDate: new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    rank: profile.rank || 'Observer',
    bio: profile.bio || '',
    coverUrl: profile.cover_url || '',
    isOwn: !!viewerUserId && viewerUserId === profile.id,
    followers: profile.follower_count || 0,
    following: profile.following_count || 0,
  };

  const uploads = profile.approved_uploads || 0;
  const curRankIdx = RANK_THRESHOLDS.findIndex(r => r.rank === spotter.rank);
  const inAutoLadder = curRankIdx >= 0;
  const nextRank = inAutoLadder && curRankIdx < RANK_THRESHOLDS.length - 1 ? RANK_THRESHOLDS[curRankIdx + 1] : null;
  const rankPct = nextRank ? Math.min(100, Math.round((uploads / nextRank.min) * 100)) : 100;

  const profilePhotoCard = (p: (typeof userPhotos)[number], animIndex: number, layout: 'hero' | 'grid') => {
    const cat = String(p.category || '');
    const airportGallery = isAirportGalleryEntry(p);
    const airportScene = cat.startsWith('AIRPORT_');
    const sceneLabel = airportScene
      ? cat.replace(/^AIRPORT_/, '').replace(/_/g, ' ').toLowerCase()
      : '';
    const apIata = (p.airport as { iata?: string })?.iata || '';
    const reg = airportGallery
      ? (apIata ? `${apIata}${sceneLabel ? ` · ${sceneLabel}` : ''}` : sceneLabel || 'Airport')
      : (p.aircraft as { registration?: string })?.registration || '?';
    const op = (p.operator as any)?.name || '';
    const ap = (p.airport as any)?.iata || '';
    const imgUrl = proxyImageUrl(p.storage_path || '');
    const wp = (p as { width_px?: number | null }).width_px;
    const hp = (p as { height_px?: number | null }).height_px;
    const frameCls = galleryFrameClass(wp, hp, layout === 'hero' ? 'aspect-video' : 'aspect-[4/3]');
    return (
      <motion.div
        key={p.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: animIndex * 0.03 }}
        className="card cursor-pointer group overflow-hidden"
        onClick={() => onPhotoClick?.(p.id)}
      >
        <div className={`relative w-full overflow-hidden bg-[#f1f5f9] ${frameCls}`}>
          <img src={imgUrl} className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer" alt="" />
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
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      {/* Cover — same base as stats strip (#f8fafc); optional cover image without fade-to-white */}
      <section className="relative" style={{ background: '#f8fafc' }}>
        <div
          className="relative overflow-hidden"
          style={{
            height: spotter.coverUrl ? 200 : 120,
            background: spotter.coverUrl ? undefined : '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {spotter.coverUrl ? (
            <img src={spotter.coverUrl} className="w-full h-full object-cover" style={{ opacity: 0.85 }} referrerPolicy="no-referrer" />
          ) : null}
        </div>

        <div className="site-w relative z-10 max-w-full min-w-0" style={{ marginTop: '-3.5rem' }}>
          <div
            className="rounded-t-2xl bg-white pt-6 pb-8 w-full max-w-full min-w-0 box-border"
            style={{
              borderBottom: '1px solid #f5f5f7',
              boxShadow: '0 -10px 40px rgba(15, 23, 42, 0.1)',
            }}
          >
            {/* Grid avoids flex shrink-0 overflow: middle column is minmax(0,1fr) */}
            <div
              className="grid w-full max-w-full min-w-0 gap-5 px-4 sm:px-5 md:px-6 box-border
                grid-cols-1
                xl:grid-cols-[auto_minmax(0,1fr)_auto]
                xl:items-start xl:gap-6"
            >
            <div className="flex justify-center xl:justify-start -mt-10 xl:-mt-[4.25rem] min-w-0">
            {spotter.avatarUrl ? (
              <img key={spotter.avatarUrl} src={proxyAvatarUrl(spotter.avatarUrl)} alt={spotter.name}
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
            <div className="min-w-0 max-w-full text-center xl:text-left xl:col-start-2 xl:row-start-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap justify-center xl:justify-start">
                <h1 className="font-headline text-3xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{spotter.name}</h1>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#f1f5f9', color: '#334155' }}>{spotter.rank}</span>
                {profile.external_verified && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#ecfdf5', color: '#047857' }}>
                    Externally verified
                  </span>
                )}
              </div>
              <div className="mt-3 space-y-2.5">
                <div
                  className="text-sm font-medium"
                  style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace', letterSpacing: '0.02em' }}
                >
                  {spotter.username}
                </div>
                <div
                  className="flex flex-wrap items-center justify-center xl:justify-start gap-x-5 gap-y-2.5 text-sm"
                  style={{ color: '#0f172a' }}
                >
                  {spotter.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: '#64748b' }} />
                      {spotter.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: '#64748b' }} />
                    Joined {spotter.joinedDate}
                  </span>
                  {spotter.homeAirportLabel && spotter.homeMapCode && (
                    <button
                      type="button"
                      onClick={() => onOpenMapAirport?.(spotter.homeMapCode!)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 -mx-1 transition-colors"
                      style={{ color: '#0f172a', background: 'transparent', border: 'none', cursor: onOpenMapAirport ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => { if (onOpenMapAirport) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      disabled={!onOpenMapAirport}
                      title={onOpenMapAirport ? 'Open on map' : undefined}
                    >
                      <Home className="w-3.5 h-3.5 shrink-0" style={{ color: '#64748b' }} />
                      <span style={{ fontFamily: '"SF Mono",monospace', fontWeight: 600, letterSpacing: '0.05em' }}>
                        {spotter.homeAirportLabel}
                      </span>
                    </button>
                  )}
                </div>
              </div>
              {spotter.bio && <p className="text-sm mt-3" style={{ color: '#334155', maxWidth: 480, lineHeight: 1.55 }}>{spotter.bio}</p>}
            </div>
            <div
              className="flex flex-col items-center gap-3 min-w-0 max-w-full w-full
                xl:col-start-3 xl:row-start-1 xl:items-end xl:pt-1"
            >
              <div className="flex items-center justify-center gap-6 sm:gap-8 flex-wrap">
                {[{ val: spotter.followers.toLocaleString('en-US'), label: 'Followers' }, { val: spotter.following.toLocaleString('en-US'), label: 'Following' }].map(s => (
                  <div key={s.label} className="text-center shrink-0">
                    <div className="text-base font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{s.val}</div>
                    <div className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center w-full xl:w-auto max-w-full">
                {spotter.isOwn ? (
                  <button
                    onClick={() => onNavigate?.('settings')}
                    className="btn-outline max-w-full"
                    style={{ height: 34, padding: '0 14px', fontSize: 12, gap: 6 }}
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!viewerUserId) {
                        onRequireLogin?.();
                        return;
                      }
                      setFollowing(f => !f);
                    }}
                    className={following ? 'btn-outline' : 'btn-primary'}
                    style={{ height: 34, padding: '0 16px', fontSize: 12, gap: 6 }}
                  >
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
        <div className="site-w flex overflow-x-auto no-scrollbar min-w-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-sm px-5 sm:px-6 py-4 transition-all shrink-0"
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
                    {photoFilter === 'All'
                      ? 'Start uploading your spotting photos to build your gallery.'
                      : photoFilter === 'Airport'
                        ? 'Airport scenes (AIRPORT_* category) and shots with no aircraft but an airport. Use Upload → Airport only for new scenes.'
                        : 'Try a different filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profilePhotoCard(filteredPhotos[0], 0, 'hero')}
                  {filteredPhotos.length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredPhotos.slice(1).map((p, i) => profilePhotoCard(p, i + 1, 'grid'))}
                    </div>
                  )}
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
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${(v / maxM) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.5 }}
                          className="w-full rounded-t-sm" style={{ background: v === maxM ? '#0f172a' : '#e2e8f0', minHeight: v > 0 ? 4 : 1 }} />
                        <span className="text-xs" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace', fontSize: 10 }}>{v || ''}</span>
                        <span className="text-[9px] leading-none truncate w-full text-center" style={{ color: '#cbd5e1' }} title={monthLabels[i]}>{monthLabels[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top airports — from photo metadata */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: '#0f172a' }}>Top Airports</h3>
                  {topAirports.length === 0 ? (
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Link airports on your shots to see airport stats.</p>
                  ) : (
                    <div className="space-y-4">
                      {topAirports.map((a, i) => (
                        <div key={a.iata}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <span className="tag">{a.iata}</span>
                            </div>
                            <span className="text-sm" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>{a.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#f8fafc' }}>
                            <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${a.pct}%` }} transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }} style={{ background: '#0ea5e9' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Categories — approved photos */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: '#0f172a' }}>Photos by category</h3>
                  {categoryStats.length === 0 ? (
                    <p className="text-xs" style={{ color: '#94a3b8' }}>No approved photos yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {categoryStats.map((c, i) => (
                        <div key={c.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs truncate pr-2" style={{ color: '#475569' }} title={c.label}>{c.label}</span>
                            <span className="text-xs shrink-0" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>{c.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#f8fafc' }}>
                            <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: i * 0.05, duration: 0.45 }} style={{ background: '#6366f1' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                {/* Engagement — views / likes (approved photos) */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: '#0f172a' }}>Engagement</h3>
                  <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>Totals across approved photos.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Total views</div>
                      <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{engagementTotals.totalViews.toLocaleString()}</div>
                    </div>
                    <div className="p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Total likes</div>
                      <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{engagementTotals.totalLikes.toLocaleString()}</div>
                    </div>
                    <div className="p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Avg views / photo</div>
                      <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{engagementTotals.n ? engagementTotals.avgViews : '—'}</div>
                    </div>
                    <div className="p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#94a3b8' }}>Avg likes / photo</div>
                      <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{engagementTotals.n ? engagementTotals.avgLikes : '—'}</div>
                    </div>
                  </div>
                </div>
                {/* Rank progress */}
                <div className="card-gray p-6 rounded-2xl">
                  <h3 className="text-sm font-semibold mb-5" style={{ color: '#0f172a' }}>Rank Progress</h3>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <Award className="w-6 h-6" style={{ color: '#0f172a' }} />
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#0f172a' }}>{spotter.rank}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>
                        {inAutoLadder ? `Level ${curRankIdx + 1} of ${RANKS.length}` : 'Manual rank (admin assigned)'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    {RANKS.map((r, i) => { const cur = inAutoLadder && i === curRankIdx, done = inAutoLadder && i < curRankIdx; return (
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
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-headline text-2xl font-bold tracking-tight" style={{ color: '#0f172a' }}>Achievements</h2>
                  <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                    {achievements.length} milestones — every empty slot is yours to unlock. Upload, explore airports, and grow your gallery.
                  </p>
                </div>
                <span className="text-sm shrink-0" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>
                  {achievements.filter(a => a.unlocked).length}/{achievements.length}
                </span>
              </div>

              {/* Slot strip: one placeholder per achievement so progress feels tangible */}
              <div
                className="rounded-2xl px-4 py-5 mb-8"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <div className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: '#94a3b8', letterSpacing: '0.06em' }}>
                  Your badges
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 md:gap-5">
                  {achievements.map((ach, i) => {
                    const Icon = ach.icon;
                    return (
                      <motion.div
                        key={ach.label}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex flex-col items-center gap-2 w-[4.75rem]"
                        title={`${ach.label} — ${ach.sub}`}
                      >
                        <div
                          className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                          style={
                            ach.unlocked
                              ? {
                                  background: ach.bg,
                                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)',
                                }
                              : {
                                  background: '#fff',
                                  border: '2px dashed #cbd5e1',
                                }
                          }
                        >
                          <Icon
                            className="w-6 h-6"
                            style={{
                              color: ach.unlocked ? ach.color : '#94a3b8',
                              opacity: ach.unlocked ? 1 : 0.35,
                            }}
                          />
                          {ach.unlocked && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: '#16a34a', border: '2px solid #f8fafc' }}
                              aria-hidden
                            >
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[10px] text-center leading-snug line-clamp-2 w-full"
                          style={{ color: ach.unlocked ? '#475569' : '#94a3b8' }}
                        >
                          {ach.label}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {achievements.map((ach, i) => { const Icon = ach.icon; return (
                  <motion.div key={`card-${ach.label}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 + i * 0.04 }}
                    className="card p-5" style={{ opacity: ach.unlocked ? 1 : 0.72 }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: ach.unlocked ? ach.bg : '#f1f5f9' }}>
                      <Icon className="w-5 h-5" style={{ color: ach.unlocked ? ach.color : '#cbd5e1' }} />
                    </div>
                    <div className="font-semibold mb-1 text-sm" style={{ color: '#0f172a' }}>{ach.label}</div>
                    <div className="text-xs leading-relaxed mb-3" style={{ color: '#94a3b8' }}>{ach.sub}</div>
                    {ach.unlocked ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16a34a' }}><CheckCircle2 className="w-3 h-3" />Unlocked</div>
                    ) : (
                      <div className="text-xs font-medium" style={{ color: '#cbd5e1' }}>Locked</div>
                    )}
                  </motion.div>
                ); })}
              </div>
            </motion.div>
          )}

          {/* LINKS — social + aviation */}
          {tab === 'Links' && (
            <motion.div key="links" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="font-headline text-2xl font-bold tracking-tight mb-1" style={{ color: '#0f172a' }}>
                    Links
                  </h2>
                  <p className="text-sm" style={{ color: '#64748b' }}>
                    Social and aviation profiles elsewhere on the web.
                  </p>
                </div>
                {spotter.isOwn && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('settings')}
                    className="btn-outline self-start sm:self-auto"
                    style={{ height: 36, padding: '0 16px', fontSize: 13 }}
                  >
                    Edit links
                  </button>
                )}
              </div>

              {spotterLinks.length === 0 ? (
                <div
                  className="relative overflow-hidden rounded-2xl px-8 py-16 text-center"
                  style={{
                    background: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 45%, #e0f2fe 100%)',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-40 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 70%)' }}
                  />
                  <div
                    className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full opacity-30 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)' }}
                  />
                  <Link2 className="w-10 h-10 mx-auto mb-4" style={{ color: '#94a3b8' }} />
                  <p className="text-sm font-medium mb-1" style={{ color: '#475569' }}>
                    No links yet
                  </p>
                  <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
                    {spotter.isOwn
                      ? 'Add Instagram, YouTube, JetPhotos, or your favourite databases — they appear here for other spotters.'
                      : 'This spotter has not added any public links.'}
                  </p>
                </div>
              ) : (
                <>
                  {(['social', 'aviation'] as const).map((group) => {
                    const subset = spotterLinks.filter((l) => l.group === group);
                    if (!subset.length) return null;
                    const title = group === 'social' ? 'Social' : 'Aviation & web';
                    const subtitle =
                      group === 'social'
                        ? 'Connect on social platforms'
                        : 'Databases, forums, and other aviation sites';
                    return (
                      <div key={group}>
                        <div className="mb-4">
                          <h3 className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8', letterSpacing: '0.12em' }}>
                            {title}
                          </h3>
                          <p className="text-xs" style={{ color: '#cbd5e1' }}>
                            {subtitle}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {subset.map((link, i) => {
                            const { Icon, gradient, glow } = spotterLinkStyle(link.url, link.group);
                            const host = spotterLinkHost(link.url);
                            return (
                              <motion.a
                                key={`${group}-${link.url}-${i}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.25 }}
                                className="group relative flex flex-col rounded-2xl p-4 text-left no-underline transition-all duration-200"
                                style={{
                                  background: '#fff',
                                  border: '1px solid #e8e8ed',
                                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = `0 12px 32px -8px ${glow}, 0 4px 12px rgba(15,23,42,0.06)`;
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
                                  e.currentTarget.style.borderColor = '#e8e8ed';
                                }}
                              >
                                <div
                                  className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full opacity-90"
                                  style={{ background: gradient }}
                                />
                                <div className="flex items-start gap-3 pl-2">
                                  <div
                                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                                    style={{ background: gradient }}
                                  >
                                    <Icon className="w-5 h-5 text-white opacity-95" strokeWidth={2} />
                                  </div>
                                  <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>
                                        {link.title}
                                      </span>
                                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94a3b8' }} />
                                    </div>
                                    {host && (
                                      <div className="text-xs truncate mt-0.5 font-mono" style={{ color: '#94a3b8' }}>
                                        {host}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};
