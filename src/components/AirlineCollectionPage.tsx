import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { resolveAirlineLogoSrc } from '../lib/airline-logo-url';
import { DreamlinerTailCard } from './airline-collection/DreamlinerTailCard';
import { AIRLINE_TAIL_PRESETS } from '../lib/airline-tail-presets';

/** When App state has not synced yet, slug is still in the URL. */
function profileSlugFromCollectionPath(): string | null {
  if (typeof window === 'undefined') return null;
  const p = window.location.pathname.replace(/\/+$/, '') || '/';
  const m = /^\/profile\/([^/]+)\/collection$/.exec(p);
  if (!m?.[1]) return null;
  try {
    const s = decodeURIComponent(m[1]).trim();
    return s || null;
  } catch {
    return null;
  }
}

const TIER_DEF = [
  { title: 'First 50 operators', slots: 50 },
  { title: '51 — 100', slots: 50 },
  { title: '101 — 500', slots: 400 },
] as const;

const TOTAL_SLOTS = TIER_DEF.reduce((s, t) => s + t.slots, 0);

const AIRLINE_COLORS: Record<string, string> = {
  AA: '#0078D2', EK: '#D71920', QR: '#5C0632', HY: '#1A7A4A',
  LH: '#05164D', SQ: '#F0A500', BA: '#075AAA', AF: '#002157',
  KL: '#00A1DE', LX: '#B40A2D', TK: '#E81932', EY: '#BD8B13',
  AI: '#D71920',
};

function accentForAirline(iata: string, name: string, icao: string): string {
  const alnum = iata.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (alnum.length >= 2) {
    const two = alnum.slice(0, 2);
    if (AIRLINE_COLORS[two]) return AIRLINE_COLORS[two];
  }
  const key = icao || name || 'x';
  let h = 0;
  for (let k = 0; k < key.length; k++) h = key.charCodeAt(k) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360} 42% 42%)`;
}

type AirlineRow = {
  id: string;
  name: string;
  iata: string | null;
  icao: string | null;
  logo_url: string | null;
};

export const AirlineCollectionPage = ({
  profileSlug,
  onBack,
}: {
  profileSlug: string | null;
  onBack: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ id: string; username: string; display_name: string | null } | null>(null);
  const [airlines, setAirlines] = useState<AirlineRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const slug = (profileSlug?.trim() || profileSlugFromCollectionPath() || '').trim() || null;
    if (!slug) {
      setProfile(null);
      setAirlines([]);
      setLoading(false);
      setError('Missing profile');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      const pq = supabase.from('user_profiles').select('id, username, display_name');
      const { data: prof, error: pe } = await (isUuid ? pq.eq('id', slug) : pq.eq('username', slug)).single();
      if (pe || !prof) throw pe ?? new Error('Profile not found');

      if (typeof window !== 'undefined' && prof.username) {
        const clean = `/profile/${encodeURIComponent(prof.username)}/collection`;
        if (window.location.pathname !== clean) {
          window.history.replaceState(window.history.state, '', clean);
        }
        document.title = `@${prof.username} — airline tails — SILKSPOT`;
      }

      setProfile(prof);

      const uid = prof.id;
      const pageSize = 1000;
      const opRows: { operator_id: string | null }[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data: chunk, error: qe } = await supabase
          .from('photos')
          .select('operator_id')
          .eq('uploader_id', uid)
          .eq('status', 'APPROVED')
          .not('operator_id', 'is', null)
          .range(from, from + pageSize - 1);
        if (qe) throw qe;
        if (!chunk?.length) break;
        opRows.push(...chunk);
        if (chunk.length < pageSize) break;
      }

      const idSet = new Set<string>();
      for (const r of opRows) {
        if (r.operator_id) idSet.add(r.operator_id);
      }
      const ids = [...idSet];
      if (ids.length === 0) {
        setAirlines([]);
        return;
      }

      const { data: alRows, error: ae } = await supabase
        .from('airlines')
        .select('id, name, iata, icao, logo_url')
        .in('id', ids);
      if (ae) throw ae;

      const list = (alRows || []) as AirlineRow[];
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setAirlines(list);
    } catch (e: unknown) {
      console.warn(e);
      setError(e instanceof Error ? e.message : 'Failed to load');
      setProfile(null);
      setAirlines([]);
    } finally {
      setLoading(false);
    }
  }, [profileSlug]);

  useEffect(() => { void load(); }, [load]);

  const tierGrids = useMemo(() => {
    const sorted = airlines;
    let offset = 0;
    return TIER_DEF.map(tier => {
      const cells: ({ airline: AirlineRow } | { empty: true })[] = [];
      for (let i = 0; i < tier.slots; i++) {
        const a = sorted[offset + i];
        cells.push(a ? { airline: a } : { empty: true });
      }
      offset += tier.slots;
      return { title: tier.title, cells };
    });
  }, [airlines]);

  const filled = airlines.length;

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 shrink-0 animate-spin" style={{ color: '#94a3b8' }} aria-hidden />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="site-w py-16 text-center">
        <p className="text-sm" style={{ color: '#94a3b8' }}>{error || 'Profile not found'}</p>
        <button type="button" className="btn-outline-sky mt-4" style={{ height: 36 }} onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="airline-collection-print-area pb-16"
      style={{ background: 'transparent' }}
    >
      <div className="site-w py-8">
        <div className="no-print mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft className="h-4 w-4" />
              Profile
            </button>
            <h1 className="font-headline text-2xl font-bold tracking-tight" style={{ color: '#f8fafc' }}>
              Airline tails
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#cbd5e1' }}>
              Boeing 787 template — one card per operator from your approved photos.{' '}
              <span style={{ fontFamily: '"SF Mono",monospace', color: '#94a3b8' }}>
                {filled}/{TOTAL_SLOTS}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium"
              style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155' }}
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </button>
          </div>
        </div>

        {/* Print header (browser PDF) */}
        <div className="mb-6 hidden print:block" style={{ borderBottom: '2px solid #0f172a', paddingBottom: 10 }}>
          <div
            className="font-headline text-xl font-bold tracking-tight"
            style={{ color: '#0f172a', letterSpacing: '-0.01em' }}
          >
            SILKSPOT — Airline tail collection
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm" style={{ color: '#475569' }}>
            <span>
              <span style={{ fontWeight: 600 }}>Spotter:</span>{' '}
              {displayName}
              {displayName !== profile.username && (
                <span style={{ fontFamily: '"B612 Mono", monospace', fontSize: 12, marginLeft: 6 }}>
                  @{profile.username}
                </span>
              )}
            </span>
            <span>
              <span style={{ fontWeight: 600 }}>Progress:</span>{' '}
              {filled} / {TOTAL_SLOTS} operators
            </span>
            <span>
              <span style={{ fontWeight: 600 }}>Date:</span>{' '}
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="space-y-12">
          {tierGrids.map((tier, ti) => (
            <section key={tier.title}>
              <h2
                className="mb-4 font-headline text-lg font-semibold tracking-tight print:text-[#0f172a]"
                style={{ color: '#e2e8f0' }}
              >
                {tier.title}
              </h2>
              <div className="flex flex-wrap gap-3 print:gap-2">
                {tier.cells.map((cell, i) => {
                  if ('empty' in cell && cell.empty) {
                    return (
                      <DreamlinerTailCard
                        key={`e-${ti}-${i}`}
                        airlineName=""
                        accentColor="#e2e8f0"
                        empty
                      />
                    );
                  }
                  const a = (cell as { airline: AirlineRow }).airline;
                  const rawIata = (a.iata && String(a.iata).trim()) || '';
                  const iataOk = /^[A-Z0-9]{2}$/i.test(rawIata);
                  const logoPx = 160;
                  const src = resolveAirlineLogoSrc({
                    logoUrl: a.logo_url,
                    iata: iataOk ? rawIata.toUpperCase() : undefined,
                    sizePx: logoPx,
                  });
                  const preset = iataOk ? AIRLINE_TAIL_PRESETS[rawIata.toUpperCase()] : undefined;
                  const accent = preset?.color ?? accentForAirline(iataOk ? rawIata : '', a.name, a.icao || '');
                  return (
                    <DreamlinerTailCard
                      key={a.id}
                      airlineName={a.name}
                      logoSrc={src || undefined}
                      accentColor={accent}
                      preset={preset}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
