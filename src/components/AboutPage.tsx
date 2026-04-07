import { motion } from 'motion/react';
import { Users, Plane, MapPin, Camera, BarChart3, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { Page } from '../types';

export const AboutPage = ({ onNavigate }: { onNavigate: (page: Page) => void }) => {
  const [spotterCount, setSpotterCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (!cancelled) setSpotterCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }} className="page-shell relative z-10">
      <div className="site-w pt-3 sm:pt-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-2xl mx-auto"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: '#cbd5e1' }}>
            About
          </p>
          <h1 className="font-headline text-3xl sm:text-4xl font-bold tracking-tight mb-6" style={{ color: '#f8fafc' }}>
            SILKSPOT
          </h1>

          <div className="rounded-xl border bg-white p-6 sm:p-8 card space-y-5" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.1)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
              SILKSPOT is an open aviation spotting platform: a curated gallery of aircraft photos tied to{' '}
              <strong style={{ color: '#0f172a' }}>registrations</strong>,{' '}
              <strong style={{ color: '#0f172a' }}>operators</strong>,{' '}
              <strong style={{ color: '#0f172a' }}>airports</strong>, and fleet context. We focus on accurate metadata so
              each image stays useful for researchers, enthusiasts, and crew—not only as a picture, but as a reference
              point in the wider fleet story.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
              Browse the live feed on Explore, dig into airline fleets, use the map to see activity by airport, and open
              community stats to discover top contributors. Spotter profiles are public so anyone can explore a
              photographer&apos;s published work.
            </p>

            <div className="pt-4 flex items-center gap-2.5 border-t" style={{ borderColor: '#f1f5f9' }}>
              <Users className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} />
              <span className="text-base font-semibold" style={{ color: '#0f172a', fontFamily: '"B612 Mono", monospace' }}>
                {spotterCount === null ? '—' : spotterCount.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                registered spotters
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => onNavigate('fleet')}
                className="btn-primary w-full sm:w-auto"
                style={{ height: 40, padding: '0 20px', fontSize: 13 }}
              >
                Browse fleet
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="btn-secondary w-full sm:w-auto"
                style={{ height: 40, padding: '0 20px', fontSize: 13 }}
              >
                Explore photos
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Camera, title: 'Explore', desc: 'Featured feed and category filters.', page: 'explore' as Page },
              { icon: Plane, title: 'Fleet', desc: 'Operators, types, and registrations.', page: 'fleet' as Page },
              { icon: MapPin, title: 'Map', desc: 'Airports and spotting context.', page: 'map' as Page },
              { icon: BarChart3, title: 'Stats', desc: 'Rankings and community metrics.', page: 'stats' as Page },
            ].map(({ icon: Icon, title, desc, page }) => (
              <button
                key={title}
                type="button"
                onClick={() => onNavigate(page)}
                className="card p-4 text-left w-full flex items-start gap-3 transition-colors bg-white hover:bg-slate-50/80"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#475569' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-headline text-sm font-bold" style={{ color: '#0f172a' }}>
                    {title}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {desc}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium mt-2" style={{ color: '#0ea5e9' }}>
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
