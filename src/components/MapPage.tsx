import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Clock, Newspaper, Globe2 } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';

// Leaflet loaded dynamically to avoid SSR issues
declare global {
  interface Window { L: any; }
}

type AirportPoint = {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  photos: number;
  spotters: number;
  hot: boolean;
};

function codeToFlag(code: string | null | undefined): string {
  const cc = (code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌍';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

function filterAirports(
  list: AirportPoint[],
  mode: 'all' | 'hot',
  searchRaw: string,
  countryCode: string | null,
): AirportPoint[] {
  const q = searchRaw.toLowerCase().trim();
  return list.filter(ap => {
    if (mode === 'hot' && !ap.hot) return false;
    if (countryCode && ap.country !== countryCode) return false;
    if (!q) return true;
    return (
      ap.iata.toLowerCase().includes(q) ||
      ap.icao.toLowerCase().includes(q) ||
      ap.name.toLowerCase().includes(q) ||
      ap.city.toLowerCase().includes(q)
    );
  });
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 45) return 'now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function asOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

type MapRecentRow = {
  id: string;
  created_at: string;
  category?: string | null;
  aircraft?: { registration?: string | null } | { registration?: string | null }[] | null;
  airport?: { iata?: string | null; name?: string | null; country_code?: string | null } | null;
  operator?: { name?: string | null } | null;
  uploader?: { username?: string | null } | null;
};

export const MapPage = ({
  focusAirportIata,
  onNavigate,
}: {
  focusAirportIata?: string | null;
  onNavigate?: (page: 'explore' | 'stats') => void;
}) => {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMap    = useRef<any>(null);
  const markersLayer  = useRef<any>(null);
  const [selected,    setSelected]  = useState<AirportPoint | null>(null);
  const [search,      setSearch]    = useState('');
  const [filter,      setFilter]    = useState<'all'|'hot'>('all');
  /** ISO-3166 alpha-2; narrows markers + lists (toggle same chip to clear). */
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [mapReady,    setMapReady]  = useState(false);
  const [airports,    setAirports]  = useState<AirportPoint[]>([]);
  /** `loading` until first airports query finishes; `error` on failure. */
  const [airportsLoad, setAirportsLoad] = useState<'loading' | 'ok' | 'error'>('loading');
  const [mapLayer,    setMapLayer]  = useState<'light'|'satellite'|'dark'>('light');
  const tileLayerRef  = useRef<any>(null);
  const [recentActivity, setRecentActivity] = useState<MapRecentRow[]>([]);
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);
  const [icaoCopied, setIcaoCopied] = useState(false);

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id  = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href= 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    if (window.L) { initMap(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || leafletMap.current) return;
    const L = window.L;

    leafletMap.current = L.map(mapRef.current, {
      center: [30, 15],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
    });

    // Default tile layer (light)
    tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(leafletMap.current);

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(leafletMap.current);

    // Attribution bottom-right, minimal
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(leafletMap.current);

    markersLayer.current = L.layerGroup().addTo(leafletMap.current);

    addMarkers();
    setMapReady(true);
  };

  const addMarkers = () => {
    if (!window.L || !markersLayer.current) return;
    const L = window.L;
    markersLayer.current.clearLayers();

    const list = filterAirports(airports, filter, search, countryFilter);

    list.forEach(ap => {
      const size = ap.photos > 20000 ? 16 : ap.photos > 10000 ? 13 : ap.photos > 5000 ? 11 : 9;
      const color = ap.hot ? '#ff3b30' : '#0f172a';

      const html = `
        <div style="
          width:${size}px; height:${size}px; border-radius:0;
          background:${color}; border:2.5px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          cursor:pointer;
          ${ap.hot ? `animation:pulse-map 1.8s ease-in-out infinite;` : ''}
        "></div>
      `;

      const icon = L.divIcon({
        html,
        className: '',
        iconSize:  [size, size],
        iconAnchor:[size/2, size/2],
      });

      const marker = L.marker([ap.lat, ap.lng], { icon })
        .on('click', () => setSelected(ap));

      markersLayer.current.addLayer(marker);
    });
  };

  const setTileLayer = (next: 'light'|'satellite'|'dark') => {
    if (!window.L || !leafletMap.current) return;
    const L = window.L;
    if (tileLayerRef.current) {
      leafletMap.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (next === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19,
      }).addTo(leafletMap.current);
    } else if (next === 'dark') {
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(leafletMap.current);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(leafletMap.current);
    }
    setMapLayer(next);
  };

  // Re-add markers when filter/search changes
  useEffect(() => {
    if (mapReady) addMarkers();
  }, [filter, search, countryFilter, mapReady, airports]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAirportsLoad('loading');
      try {
        const photoRows: Array<{ airport_id: string | null }> = [];
        const pageSize = 1000;
        const maxRows = 100000;
        let photoQueryFailed = false;
        for (let offset = 0; offset < maxRows; offset += pageSize) {
          const { data, error } = await supabase
            .from('photos')
            .select('airport_id')
            .eq('status', 'APPROVED')
            .not('airport_id', 'is', null)
            .range(offset, offset + pageSize - 1);
          if (error) {
            console.error('Map photos load:', error);
            photoQueryFailed = true;
            break;
          }
          const chunk = (data ?? []) as Array<{ airport_id: string | null }>;
          photoRows.push(...chunk);
          if (chunk.length < pageSize) break;
        }
        if (cancelled) return;

        if (photoQueryFailed) {
          setAirports([]);
          setAirportsLoad('error');
          return;
        }

        const counts = new Map<string, number>();
        for (const r of photoRows) {
          const id = r?.airport_id;
          if (!id) continue;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        const airportIds = Array.from(counts.keys());
        if (!airportIds.length) {
          setAirports([]);
          setAirportsLoad('ok');
          return;
        }

        const apRows: any[] = [];
        const idChunkSize = 500;
        for (let i = 0; i < airportIds.length; i += idChunkSize) {
          const ids = airportIds.slice(i, i + idChunkSize);
          const { data, error } = await supabase
            .from('airports')
            .select('id, iata, icao, name, city, country_code, lat, lng, photo_count, spotter_count')
            .in('id', ids)
            .not('iata', 'is', null)
            .not('lat', 'is', null)
            .not('lng', 'is', null);
          if (error) {
            console.error('Map airports load:', error);
            continue;
          }
          apRows.push(...(data ?? []));
        }
        if (cancelled) return;

        const mapped: AirportPoint[] = apRows.map((a) => {
          const tablePhotos = Number(a.photo_count || 0);
          const realPhotos = counts.get(a.id) || 0;
          const photos = Math.max(tablePhotos, realPhotos);
          return {
            iata: String(a.iata || '').trim().toUpperCase(),
            icao: String(a.icao || '').trim().toUpperCase(),
            name: String(a.name || 'Unknown airport'),
            city: String(a.city || 'Unknown city'),
            country: String(a.country_code || '').toUpperCase(),
            flag: codeToFlag(a.country_code),
            lat: Number(a.lat),
            lng: Number(a.lng),
            photos,
            spotters: Number(a.spotter_count || 0),
            hot: photos >= 250,
          };
        }).filter(a =>
          !!a.iata &&
          Number.isFinite(a.lat) &&
          Number.isFinite(a.lng),
        );

        setAirports(mapped);
        setAirportsLoad('ok');
      } catch (e) {
        console.error('Map load failed:', e);
        if (!cancelled) {
          setAirports([]);
          setAirportsLoad('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select(`
            id,
            created_at,
            category,
            aircraft ( registration ),
            airport:airports ( iata, name, country_code ),
            operator:airlines ( name ),
            uploader:user_profiles ( username )
          `)
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false })
          .limit(10);
        if (cancelled) return;
        if (error) {
          console.warn('Map recent activity:', error);
          setRecentActivity([]);
          return;
        }
        setRecentActivity((data ?? []) as MapRecentRow[]);
      } catch {
        if (!cancelled) setRecentActivity([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!focusAirportIata) return;
    const code = focusAirportIata.trim().toUpperCase();
    if (!code) return;
    const ap =
      airports.find(x => x.iata.toUpperCase() === code) ||
      airports.find(x => x.icao.toUpperCase() === code);
    if (ap) flyTo(ap);
  }, [focusAirportIata, mapReady, airports]);

  useEffect(() => {
    if (!mapReady || !leafletMap.current || !mapRef.current) return;
    const map = leafletMap.current;
    const el = mapRef.current;
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapReady]);

  const mapAggregates = useMemo(() => {
    let totalPhotos = 0;
    let totalSpotters = 0;
    const byCountry = new Map<string, { photos: number; airports: number }>();
    for (const ap of airports) {
      totalPhotos += ap.photos;
      totalSpotters += ap.spotters;
      const c = (ap.country || '?').toUpperCase();
      const cur = byCountry.get(c) || { photos: 0, airports: 0 };
      cur.photos += ap.photos;
      cur.airports += 1;
      byCountry.set(c, cur);
    }
    const hotCount = airports.filter(a => a.hot).length;
    const topCountries = [...byCountry.entries()]
      .map(([code, v]) => ({
        code,
        photos: v.photos,
        airports: v.airports,
        flag: codeToFlag(code),
      }))
      .sort((a, b) => b.photos - a.photos)
      .slice(0, 14);
    return {
      totalPhotos,
      totalSpotters,
      hotCount,
      countryCount: byCountry.size,
      topCountries,
    };
  }, [airports]);

  const visible = useMemo(
    () => filterAirports(airports, filter, search, countryFilter),
    [airports, filter, search, countryFilter],
  );

  const flyTo = (ap: AirportPoint) => {
    setSelected(ap);
    if (leafletMap.current) {
      leafletMap.current.flyTo([ap.lat, ap.lng], 11, { duration: 1.2 });
    }
  };

  const fitVisibleBounds = () => {
    if (!window.L || !leafletMap.current || visible.length === 0) return;
    const L = window.L;
    const bounds = L.latLngBounds(visible.map(ap => [ap.lat, ap.lng]));
    leafletMap.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: true });
  };

  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      className="page-shell relative z-10 flex w-full min-w-0 flex-col bg-transparent explore-telemetry"
      style={{ minHeight: 'calc(100dvh - 52px)' }}
    >

      {/* Pulse animation for hot airports */}
      <style>{`
        @keyframes pulse-map {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.4); opacity:.6; }
        }
        .leaflet-container { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif; }
        .leaflet-popup-content-wrapper { border-radius:0!important; box-shadow:0 8px 30px rgba(0,0,0,0.12)!important; }
        .leaflet-popup-tip-container { display:none; }
        .leaflet-control-zoom a { border-radius:0!important; }
      `}</style>

      {/* Same content width as Explore (`site-w` = max-width 1140px + side padding) */}
      <div className="site-w w-full min-w-0 pt-3 sm:pt-4 pb-8">
      {/* Slim toolbar */}
      <header
        className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b pb-3"
        style={{ background: 'transparent', borderColor: 'rgba(226,232,240,0.35)' }}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#cbd5e1' }}>Atlas</div>
          <h1 className="font-headline text-lg font-bold leading-tight tracking-tight sm:text-xl" style={{ color: '#f8fafc' }}>
            Airport Map
          </h1>
          <p className="text-[11px] leading-snug sm:text-xs" style={{ color: '#e2e8f0' }}>
            {airportsLoad === 'loading' && 'Loading airports from approved photos…'}
            {airportsLoad === 'error' && 'Could not load airport data.'}
            {airportsLoad === 'ok' && airports.length === 0 && 'No airports with approved photo locations yet.'}
            {airportsLoad === 'ok' && airports.length > 0 && (
              <>
                {airports.length} airports · tap a dot for details
                {countryFilter ? ` · ${countryFilter}` : ''}
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={fitVisibleBounds}
            disabled={visible.length === 0}
            title="Zoom the map to show all airports that match the current filters"
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: 'rgba(15,23,42,0.35)',
              color: '#e2e8f0',
              border: '1px solid rgba(226,232,240,0.35)',
            }}
          >
            <Globe2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            Fit map
          </button>
          {(['all', 'hot'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              title={
                f === 'all'
                  ? 'Show every airport in the map dataset'
                  : 'Only airports with 250+ approved photos on SILKSPOT'
              }
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? '#0f172a' : 'transparent',
                color: filter === f ? '#fff' : '#cbd5e1',
                border: filter === f ? '1px solid #0f172a' : '1px solid rgba(226,232,240,0.45)',
              }}
            >
              {f === 'all'
                ? 'All'
                : `🔥 Hot · ${mapAggregates.hotCount}`}
            </button>
          ))}
        </div>
      </header>

      {/* Map — width matches Explore grid */}
      <div
        className="relative w-full flex-1 overflow-hidden rounded-xl border shadow-sm"
        style={{ borderColor: '#e2e8f0', minHeight: 'min(58vh, 620px)' }}
      >
        <div ref={mapRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />

        {!mapReady && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <div className="text-center">
              <div
                className="mx-auto mb-2 h-7 w-7 animate-spin rounded-full border-2"
                style={{ borderColor: '#e2e8f0', borderTopColor: '#0ea5e9' }}
              />
              <div className="text-xs" style={{ color: '#94a3b8' }}>Loading map…</div>
            </div>
          </div>
        )}

        {mapReady && airportsLoad === 'loading' && (
          <div
            className="pointer-events-none absolute left-1/2 top-14 z-[600] -translate-x-1/2 rounded-lg border px-3 py-1.5 text-[10px] font-medium shadow-sm"
            style={{ background: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', color: '#475569' }}
          >
            Loading airport markers…
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity:0, scale:0.96, y:4 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.96 }}
              className="pointer-events-auto absolute z-[1000] max-w-[min(100%,260px)] rounded-xl border shadow-lg"
              style={{
                top: 12,
                left: 12,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(12px)',
                borderColor: '#e2e8f0',
              }}
            >
              <div className="p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className="text-lg leading-none">{selected.flag}</span>
                      <span className="font-mono text-base font-bold tracking-tight" style={{ color: '#0f172a' }}>{selected.iata}</span>
                      {selected.hot && <span className="text-xs">🔥</span>}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: '#475569' }}>{selected.name}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>{selected.city}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-slate-100"
                    style={{ color: '#64748b' }}
                    aria-label="Close airport details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div
                  className="mb-2 flex items-center gap-2 border-t border-b py-2"
                  style={{ borderColor: '#f1f5f9' }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate?.('explore')}
                    className="flex-1 text-center rounded py-1 transition-colors hover:bg-slate-50"
                    title="Browse photos on Explore"
                  >
                    <div className="font-mono text-xs font-semibold" style={{ color: '#0ea5e9' }}>{selected.photos.toLocaleString('en-US')}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>photos</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('stats')}
                    className="flex-1 text-center rounded py-1 transition-colors hover:bg-slate-50"
                    title="View spotters on Stats"
                  >
                    <div className="font-mono text-xs font-semibold" style={{ color: '#0f172a' }}>{selected.spotters}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>spotters</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selected.icao) return;
                      navigator.clipboard.writeText(selected.icao).then(() => {
                        setIcaoCopied(true);
                        setTimeout(() => setIcaoCopied(false), 1500);
                      }).catch(() => {});
                    }}
                    className="flex-1 text-center rounded py-1 transition-colors hover:bg-slate-50"
                    title="Copy ICAO code"
                  >
                    <div className="font-mono text-[10px]" style={{ color: '#64748b' }}>
                      {icaoCopied ? '✓ Copied' : selected.icao}
                    </div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>ICAO</div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (leafletMap.current && selected) leafletMap.current.flyTo([selected.lat, selected.lng], 14, { duration: 1 });
                  }}
                  className="btn-primary h-8 w-full justify-center text-[11px]"
                >
                  Zoom in →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-[10px]"
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#e8e8ed', color: '#475569' }}
        >
          {[{ color: '#ff3b30', label: 'Hot' }, { color: '#0f172a', label: 'Active' }].map(l => (
            <div key={l.label} className="pointer-events-none flex items-center gap-1">
              <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          <span className="pointer-events-none text-slate-400">· size ∝ photos</span>
        </div>

        <div
          className="absolute left-3 top-3 z-[1000] flex items-center gap-1 rounded-lg border p-1"
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#e8e8ed' }}
        >
          {([
            { id: 'light' as const, label: 'Light' },
            { id: 'satellite' as const, label: 'Sat' },
            { id: 'dark' as const, label: 'Dark' },
          ]).map(layer => (
            <button
              key={layer.id}
              type="button"
              onClick={() => setTileLayer(layer.id)}
              className="rounded px-2 py-1 text-[10px] font-medium"
              style={{
                background: mapLayer === layer.id ? '#0f172a' : '#fff',
                color: mapLayer === layer.id ? '#fff' : '#475569',
                border: mapLayer === layer.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
              }}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Recent catalog additions: APPROVED only (instant for external_verified uploaders, else after review) */}
        <AnimatePresence>
          {recentActivityOpen ? (
            <motion.div
              key="activity-panel"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto absolute bottom-12 right-3 z-[1000] flex max-h-[min(42vh,260px)] w-[min(100%,300px)] flex-col overflow-hidden rounded-xl border shadow-lg sm:bottom-10"
              style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(12px)',
                borderColor: '#e2e8f0',
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
                style={{ borderColor: '#f1f5f9', background: 'rgba(248,250,252,0.9)' }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Newspaper className="h-3.5 w-3.5 shrink-0" style={{ color: '#64748b' }} aria-hidden />
                  <span className="truncate text-[11px] font-semibold" style={{ color: '#0f172a' }}>Recent in catalog</span>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px]" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Approved</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentActivityOpen(false)}
                  className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-slate-100"
                  style={{ color: '#64748b' }}
                  aria-label="Hide recent catalog panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5 no-scrollbar">
                {recentActivity.length === 0 ? (
                  <p className="text-[10px] leading-snug" style={{ color: '#94a3b8' }}>
                    Nothing in the public catalog yet. Verified spotters publish instantly; everyone else after review.
                  </p>
                ) : (
                  recentActivity.map((row) => {
                    const ac = asOne(row.aircraft);
                    const apRow = asOne(row.airport);
                    const op = asOne(row.operator);
                    const up = asOne(row.uploader);
                    const iata = (apRow?.iata || '').trim().toUpperCase();
                    const flag = codeToFlag(apRow?.country_code);
                    const reg = (ac?.registration || '').trim() || '—';
                    const cat = row.category ? String(row.category).replace(/_/g, ' ') : '';
                    const line = [reg, cat].filter(Boolean).join(' · ');
                    return (
                      <div key={row.id} className="flex items-start gap-2 text-[11px]">
                        <span className="text-sm leading-none">{flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                            {iata ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const apt = airports.find(x => x.iata === iata);
                                  if (apt) flyTo(apt);
                                }}
                                className="tag text-[9px] transition-opacity hover:opacity-80"
                              >
                                {iata}
                              </button>
                            ) : (
                              <span className="text-[9px]" style={{ color: '#cbd5e1' }}>—</span>
                            )}
                            <span style={{ color: '#94a3b8' }}>{up?.username || 'Spotter'}</span>
                          </div>
                          <p className="leading-snug" style={{ color: '#475569' }}>{line}</p>
                          {op?.name ? (
                            <p className="mt-0.5 text-[10px] leading-snug" style={{ color: '#94a3b8' }}>{op.name}</p>
                          ) : null}
                        </div>
                        <span className="flex shrink-0 items-center gap-0.5 font-mono text-[9px]" style={{ color: '#cbd5e1' }}>
                          <Clock className="h-3 w-3" aria-hidden />
                          {fmtAgo(row.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="activity-tab"
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={() => setRecentActivityOpen(true)}
              className="pointer-events-auto absolute bottom-12 right-3 z-[1000] flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-medium shadow-md transition-colors hover:bg-white sm:bottom-10"
              style={{
                background: 'rgba(255,255,255,0.95)',
                borderColor: '#e2e8f0',
                color: '#475569',
              }}
              aria-label="Show recent catalog additions"
            >
              <Newspaper className="h-3.5 w-3.5 shrink-0" style={{ color: '#64748b' }} aria-hidden />
              Recent catalog
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 w-full shrink-0 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search IATA, city, name…"
              className="w-full"
              style={{ paddingLeft: 36, paddingRight: search ? 36 : 12, height: 36, fontSize: 13 }}
              aria-label="Search airports"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-slate-100"
                style={{ color: '#94a3b8' }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { label: 'Photos', value: fmtCompact(mapAggregates.totalPhotos), hint: 'sum over map airports' },
              { label: 'Airports', value: String(airports.length), hint: 'in this dataset' },
              { label: 'Countries', value: String(mapAggregates.countryCount), hint: 'distinct country codes' },
              { label: 'Spotters (est.)', value: fmtCompact(mapAggregates.totalSpotters), hint: 'from airport directory' },
            ].map(row => (
              <div
                key={row.label}
                className="card shrink-0 px-3 py-2"
                style={{ minWidth: '6.25rem' }}
                title={row.hint}
              >
                <div className="font-mono text-sm font-semibold tabular-nums" style={{ color: '#0f172a' }}>{row.value}</div>
                <div className="text-[10px] font-medium leading-tight" style={{ color: '#64748b' }}>{row.label}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Top countries by photos
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mapAggregates.topCountries.map(c => {
                const active = countryFilter === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountryFilter(prev => (prev === c.code ? null : c.code))}
                    title={`${active ? 'Clear filter · ' : ''}${c.airports} airports · ${c.photos.toLocaleString('en-US')} photos — click to ${active ? 'show all countries' : 'filter map & list'}`}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors"
                    style={{
                      background: active ? 'rgba(14,165,233,0.12)' : '#fff',
                      borderColor: active ? '#0ea5e9' : '#e2e8f0',
                      color: active ? '#0369a1' : '#475569',
                    }}
                  >
                    <span className="text-sm leading-none">{c.flag}</span>
                    <span className="font-mono">{c.code}</span>
                    <span className="tabular-nums opacity-80">{fmtCompact(c.photos)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="card overflow-hidden lg:col-span-6">
            <div
              className="flex items-center justify-between px-3 py-1.5"
              style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#94a3b8' }}>Airports</span>
              <span className="font-mono text-[10px]" style={{ color: '#94a3b8' }}>{visible.length}</span>
            </div>
            <div className="max-h-[160px] overflow-y-auto no-scrollbar">
              {visible.map(ap => (
                <button
                  key={ap.iata}
                  type="button"
                  onClick={() => flyTo(ap)}
                  className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-[12px] transition-colors last:border-b-0"
                  style={{
                    borderColor: '#f1f5f9',
                    background: selected?.iata === ap.iata ? 'rgba(14,165,233,0.06)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (selected?.iata !== ap.iata) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (selected?.iata !== ap.iata) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="text-base leading-none">{ap.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="tag text-[10px]">{ap.iata}</span>
                      <span className="truncate font-medium" style={{ color: '#0f172a' }}>{ap.city}</span>
                      {ap.hot && <span className="text-[10px]">🔥</span>}
                    </div>
                    <div className="truncate text-[10px]" style={{ color: '#94a3b8' }}>{ap.name}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[10px] font-medium" style={{ color: '#0ea5e9' }}>{ap.photos.toLocaleString('en-US')}</div>
                    <div className="text-[9px]" style={{ color: '#94a3b8' }}>photos</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-3 lg:col-span-6">
            <h3 className="mb-2 text-xs font-semibold" style={{ color: '#0f172a' }}>Top by photos</h3>
            <div className="space-y-0">
              {[...airports].sort((a, b) => b.photos - a.photos).slice(0, 5).map((ap, i) => (
                <button
                  key={ap.iata}
                  type="button"
                  onClick={() => flyTo(ap)}
                  className="flex w-full items-center gap-2 border-b py-2 text-left transition-colors last:border-0 hover:bg-slate-50/80"
                  style={{ borderColor: '#f1f5f9' }}
                >
                  <span className="w-4 shrink-0 text-right font-mono text-[10px]" style={{ color: '#cbd5e1' }}>{i + 1}</span>
                  <span className="text-sm leading-none">{ap.flag}</span>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="tag text-[9px]">{ap.iata}</span>
                    <span className="truncate text-[10px]" style={{ color: '#475569' }}>{ap.name}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] font-medium" style={{ color: '#0f172a' }}>{ap.photos.toLocaleString('en-US')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
};
