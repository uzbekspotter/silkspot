import { motion } from 'motion/react';
import { Camera, Eye, Heart, Plane, MapPin, Globe2, Award, Users, Star, ArrowUp, Activity, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';

type Tab = 'Overview' | 'Spotters' | 'Aircraft';

const TABS: Tab[] = ['Overview', 'Spotters', 'Aircraft'];

export const StatsPage = () => {
  const [tab, setTab] = useState<Tab>('Overview');
  const [loading, setLoading] = useState(true);

  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [topSpotters, setTopSpotters] = useState<any[]>([]);
  const [topTypes, setTopTypes] = useState<any[]>([]);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [photosRes, usersRes, spottersRes] = await Promise.all([
        supabase.from('photos').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_profiles')
          .select('id, username, display_name, rank, approved_uploads, total_views, location')
          .order('approved_uploads', { ascending: false })
          .limit(20),
      ]);

      setTotalPhotos(photosRes.count ?? 0);
      setTotalUsers(usersRes.count ?? 0);
      setTopSpotters(spottersRes.data ?? []);

      const { data: typeData } = await supabase
        .from('photos')
        .select('aircraft(aircraft_types(name))')
        .not('aircraft', 'is', null)
        .limit(500);

      if (typeData) {
        const counts: Record<string, number> = {};
        for (const p of typeData) {
          const t = (p.aircraft as any)?.aircraft_types?.name;
          if (t) counts[t] = (counts[t] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([type, count]) => ({ type, count }));
        const maxCount = sorted[0]?.count || 1;
        setTopTypes(sorted.map(t => ({ ...t, pct: Math.round((t.count / maxCount) * 100) })));
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const globalStats = [
    { label: 'Total Photos', value: totalPhotos.toLocaleString(), icon: Camera, color: '#0ea5e9' },
    { label: 'Active Spotters', value: totalUsers.toLocaleString(), icon: Users, color: '#ff9500' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: '#fff', minHeight: '100vh' }}>

      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-10">
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Analytics</div>
          <h1 className="font-headline text-4xl font-bold tracking-tight" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>Platform Statistics</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Live data from the SteppeSpot community.</p>
        </div>
        <div className="site-w flex">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="text-sm px-6 py-4 transition-all"
              style={{ color: tab === t ? '#0f172a' : '#475569', borderBottom: tab === t ? '2px solid #0f172a' : '2px solid transparent', fontWeight: tab === t ? 500 : 400, background: 'transparent' }}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <div className="site-w py-10">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#94a3b8' }} />
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'Overview' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {globalStats.map((s, i) => { const Icon = s.icon; return (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card p-5">
                      <Icon className="w-4 h-4 mb-3" style={{ color: s.color }} />
                      <div className="text-xl font-semibold mb-1 tracking-tight" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{s.value}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>{s.label}</div>
                    </motion.div>
                  ); })}
                </div>

                {topTypes.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-base font-semibold mb-5 tracking-tight" style={{ color: '#0f172a' }}>Most Photographed Aircraft Types</h3>
                    <div className="space-y-4">
                      {topTypes.map((t, i) => (
                        <div key={t.type}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{t.type}</span>
                            <span className="text-sm" style={{ color: '#0ea5e9', fontFamily: '"SF Mono",monospace' }}>{t.count}</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#f8fafc' }}>
                            <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }} style={{ background: '#0f172a' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* SPOTTERS */}
            {tab === 'Spotters' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {topSpotters.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-10 h-10 mx-auto mb-4" style={{ color: '#e2e8f0' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No spotters yet. Be the first to upload!</p>
                  </div>
                ) : (
                  <>
                    {topSpotters.length >= 3 && (
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        {[topSpotters[1], topSpotters[0], topSpotters[2]].filter(Boolean).map((s, idx) => {
                          const isFirst = idx === 1;
                          const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                          return (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: isFirst ? 0 : 10 }} transition={{ delay: idx * 0.1 }}
                              className="card p-6 text-center" style={{ border: isFirst ? '1px solid #e2e8f0' : '1px solid #f5f5f7' }}>
                              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-sm"
                                style={{ background: '#0f172a', color: '#fff' }}>
                                {(s.display_name || s.username || '?')[0].toUpperCase()}
                              </div>
                              <div className="text-3xl font-bold mb-2 tracking-tight" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>#{rank}</div>
                              <div className="font-semibold mb-1 tracking-tight" style={{ color: '#0f172a' }}>{s.display_name || s.username}</div>
                              <div className="text-xs mb-3" style={{ color: '#94a3b8' }}>{s.rank || 'Observer'}</div>
                              <div className="text-xl font-semibold" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{(s.approved_uploads || 0).toLocaleString()}</div>
                              <div className="text-xs" style={{ color: '#94a3b8' }}>photos</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                    <div className="card overflow-hidden">
                      <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ gridTemplateColumns: '40px 1fr 80px 100px', background: '#f8fafc', borderBottom: '1px solid #f5f5f7', color: '#94a3b8', letterSpacing: '0.05em' }}>
                        <div>#</div><div>Spotter</div><div>Level</div><div>Photos</div>
                      </div>
                      {topSpotters.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="grid items-center px-6 py-4"
                          style={{ gridTemplateColumns: '40px 1fr 80px 100px', borderBottom: '1px solid #f5f5f7' }}>
                          <div className="text-sm font-medium" style={{ color: i < 3 ? '#ff9500' : '#94a3b8', fontFamily: '"SF Mono",monospace' }}>#{i + 1}</div>
                          <div className="font-medium tracking-tight" style={{ color: '#0f172a' }}>{s.display_name || s.username}</div>
                          <div><span className="tag-accent">{s.rank || 'Observer'}</span></div>
                          <div className="font-medium" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{(s.approved_uploads || 0).toLocaleString()}</div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* AIRCRAFT */}
            {tab === 'Aircraft' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {topTypes.length === 0 ? (
                  <div className="text-center py-16">
                    <Plane className="w-10 h-10 mx-auto mb-4" style={{ color: '#e2e8f0' }} />
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No aircraft data yet. Upload photos to populate this section.</p>
                  </div>
                ) : (
                  <div className="card p-6">
                    <h3 className="text-base font-semibold mb-5 tracking-tight" style={{ color: '#0f172a' }}>Most Photographed Types</h3>
                    {topTypes.map((t, i) => (
                      <div key={t.type} className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium" style={{ color: '#0f172a' }}>{t.type}</span>
                          <span className="text-sm" style={{ color: '#0ea5e9', fontFamily: '"SF Mono",monospace' }}>{t.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: '#f8fafc' }}>
                          <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ delay: i * 0.07 + 0.2, duration: 0.5 }} style={{ background: '#0f172a' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
