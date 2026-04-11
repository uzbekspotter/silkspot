import { Search, X, Plane, MapPin, User, LayoutGrid, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { searchAirports } from '../airports';

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

type AcHit = { registration: string };
type SpotHit = { id: string; username: string; display_name: string | null };

export function GlobalNavSearch({
  onAircraft,
  onAirport,
  onSpotter,
  onFleetSearch,
}: {
  onAircraft: (registration: string) => void;
  onAirport: (iata: string) => void;
  onSpotter: (userId: string) => void;
  onFleetSearch: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aircraft, setAircraft] = useState<AcHit[]>([]);
  const [spotters, setSpotters] = useState<SpotHit[]>([]);
  const [airports, setAirports] = useState<ReturnType<typeof searchAirports>>([]);
  const fetchGen = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimer = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearBlurTimer();
    setOpen(false);
    setQuery('');
    setAircraft([]);
    setSpotters([]);
    setAirports([]);
  }, []);

  const scheduleClose = () => {
    clearBlurTimer();
    blurTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      fetchGen.current += 1;
      setLoading(false);
      setAircraft([]);
      setSpotters([]);
      setAirports([]);
      return;
    }

    const t = window.setTimeout(() => {
      const gen = ++fetchGen.current;
      setLoading(true);

      const run = async () => {
        const esc = escapeIlike(q);
        const regNorm = q.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9-]/g, '');
        const apLocal = searchAirports(q, 6);
        const spotQ = q.replace(/[(),|]/g, ' ').trim();
        const escSpot = escapeIlike(spotQ);

        const [acRes, spRes] = await Promise.all([
          regNorm.length >= 2
            ? supabase.from('aircraft').select('registration').ilike('registration', `%${esc}%`).limit(8)
            : Promise.resolve({ data: [] as AcHit[] | null, error: null }),
          spotQ.length >= 2
            ? supabase
                .from('user_profiles')
                .select('id, username, display_name')
                .or(`username.ilike.%${escSpot}%,display_name.ilike.%${escSpot}%`)
                .limit(8)
            : Promise.resolve({ data: [] as SpotHit[] | null, error: null }),
        ]);

        if (gen !== fetchGen.current) return;

        setAircraft((acRes.data ?? []) as AcHit[]);
        setSpotters((spRes.data ?? []) as SpotHit[]);
        setAirports(apLocal);
        setLoading(false);
      };

      void run().catch(() => {
        if (gen === fetchGen.current) setLoading(false);
      });
    }, 280);

    return () => window.clearTimeout(t);
  }, [query]);

  const pickFirst = () => {
    const t = query.trim();
    if (!t) return;
    if (aircraft[0]) {
      onAircraft(aircraft[0].registration);
      close();
      return;
    }
    if (airports[0]) {
      onAirport(airports[0].iata);
      close();
      return;
    }
    if (spotters[0]) {
      onSpotter(spotters[0].id);
      close();
      return;
    }
    onFleetSearch(t);
    close();
  };

  const hasRows = aircraft.length > 0 || airports.length > 0 || spotters.length > 0;

  return (
    <div className="relative flex items-center">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-visible"
            style={{ maxWidth: 'min(280px, calc(100vw - 8rem))' }}
          >
            <input
              autoFocus
              type="text"
              value={query}
              placeholder="Reg, airport, spotter…"
              aria-autocomplete="list"
              aria-expanded={open}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pickFirst();
                }
                if (e.key === 'Escape') close();
              }}
              onFocus={() => clearBlurTimer()}
              onBlur={scheduleClose}
              style={{
                height: 32,
                fontSize: 13,
                paddingRight: 32,
                paddingLeft: 12,
                borderRadius: 980,
                width: '100%',
                background: '#132337',
                border: '1px solid #2d4a63',
                color: '#f8fafc',
                outline: 'none',
              }}
            />
            <button
              type="button"
              aria-label="Close search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
              style={{ color: '#cbd5e1' }}
              onMouseDown={e => e.preventDefault()}
              onClick={close}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div
              role="listbox"
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] max-h-[min(70vh,360px)] overflow-y-auto rounded-xl border shadow-xl"
              style={{
                background: '#0f172a',
                borderColor: '#334155',
                boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
              }}
              onMouseDown={e => e.preventDefault()}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs" style={{ color: '#94a3b8' }}>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Searching…
                </div>
              ) : query.trim().length < 2 ? (
                <p className="px-3 py-3 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                  Type at least 2 characters. Match aircraft registration, airport (IATA/city), or spotter name.
                </p>
              ) : (
                <>
                  {aircraft.map(a => (
                    <button
                      key={a.registration}
                      type="button"
                      role="option"
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors"
                      style={{ color: '#e2e8f0' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => {
                        onAircraft(a.registration);
                        close();
                      }}
                    >
                      <Plane className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="font-mono font-semibold">{a.registration}</span>
                      <span style={{ color: '#64748b' }}>Aircraft</span>
                    </button>
                  ))}
                  {airports.map(ap => (
                    <button
                      key={ap.iata}
                      type="button"
                      role="option"
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors"
                      style={{ color: '#e2e8f0' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => {
                        onAirport(ap.iata);
                        close();
                      }}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="font-mono font-semibold">{ap.iata}</span>
                      <span className="truncate" style={{ color: '#94a3b8' }}>
                        {ap.city} · {ap.name}
                      </span>
                    </button>
                  ))}
                  {spotters.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors"
                      style={{ color: '#e2e8f0' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => {
                        onSpotter(s.id);
                        close();
                      }}
                    >
                      <User className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="font-medium truncate">{s.display_name || s.username}</span>
                      <span className="font-mono shrink-0" style={{ color: '#64748b' }}>
                        @{s.username}
                      </span>
                    </button>
                  ))}
                  {!hasRows && !loading ? (
                    <p className="px-3 py-3 text-xs" style={{ color: '#94a3b8' }}>
                      No quick matches. Press <kbd className="px-1 rounded" style={{ background: '#1e293b' }}>Enter</kbd> to search the Fleet database.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs border-t transition-colors"
                    style={{ color: '#7dd3fc', borderColor: '#1e293b' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => {
                      onFleetSearch(query.trim());
                      close();
                    }}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0 opacity-90" />
                    Search fleet for &ldquo;{query.trim()}&rdquo;
                  </button>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <button
            key="closed"
            type="button"
            onClick={() => setOpen(true)}
            className="nav-link"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: 'inherit' }} />
            <span className="hidden lg:inline">Search</span>
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}
