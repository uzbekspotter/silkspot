import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Leaflet loaded dynamically to avoid SSR issues
declare global {
  interface Window { L: any; }
}

const DEMO_AIRPORTS = [
  {iata:'DXB',icao:'OMDB',name:'Dubai International',      city:'Dubai',        country:'AE',flag:'🇦🇪',lat:25.2528, lng:55.3644,  photos:28420,spotters:847,  hot:true },
  {iata:'LHR',icao:'EGLL',name:'London Heathrow',          city:'London',       country:'GB',flag:'🇬🇧',lat:51.4775, lng:-0.4614,  photos:24180,spotters:721,  hot:false},
  {iata:'CDG',icao:'LFPG',name:'Paris Charles de Gaulle',  city:'Paris',        country:'FR',flag:'🇫🇷',lat:49.0128, lng:2.5500,   photos:19840,spotters:612,  hot:false},
  {iata:'FRA',icao:'EDDF',name:'Frankfurt Airport',        city:'Frankfurt',    country:'DE',flag:'🇩🇪',lat:50.0379, lng:8.5622,   photos:17320,spotters:541,  hot:false},
  {iata:'AMS',icao:'EHAM',name:'Amsterdam Schiphol',       city:'Amsterdam',    country:'NL',flag:'🇳🇱',lat:52.3086, lng:4.7639,   photos:15910,spotters:498,  hot:false},
  {iata:'SIN',icao:'WSSS',name:'Singapore Changi',         city:'Singapore',    country:'SG',flag:'🇸🇬',lat:1.3592,  lng:103.9894, photos:14780,spotters:467,  hot:true },
  {iata:'JFK',icao:'KJFK',name:'JFK International',        city:'New York',     country:'US',flag:'🇺🇸',lat:40.6413, lng:-73.7781, photos:21340,spotters:634,  hot:true },
  {iata:'NRT',icao:'RJAA',name:'Tokyo Narita',             city:'Tokyo',        country:'JP',flag:'🇯🇵',lat:35.7720, lng:140.3929, photos:18920,spotters:589,  hot:false},
  {iata:'SYD',icao:'YSSY',name:'Sydney Kingsford Smith',   city:'Sydney',       country:'AU',flag:'🇦🇺',lat:-33.9461,lng:151.1772, photos:12340,spotters:398,  hot:false},
  {iata:'DFW',icao:'KDFW',name:'Dallas/Fort Worth',        city:'Dallas',       country:'US',flag:'🇺🇸',lat:32.8998, lng:-97.0403, photos:9870, spotters:312,  hot:false},
  {iata:'IST',icao:'LTFM',name:'Istanbul Airport',         city:'Istanbul',     country:'TR',flag:'🇹🇷',lat:41.2753, lng:28.7519,  photos:16420,spotters:523,  hot:true },
  {iata:'TAS',icao:'UTTT',name:'Tashkent International',   city:'Tashkent',     country:'UZ',flag:'🇺🇿',lat:41.2579, lng:69.2814,  photos:3420, spotters:124,  hot:false},
  {iata:'HKG',icao:'VHHH',name:'Hong Kong International', city:'Hong Kong',    country:'HK',flag:'🇭🇰',lat:22.3080, lng:113.9185, photos:13480,spotters:428,  hot:false},
  {iata:'GRU',icao:'SBGR',name:'São Paulo Guarulhos',     city:'São Paulo',    country:'BR',flag:'🇧🇷',lat:-23.4356,lng:-46.4731, photos:7820, spotters:241,  hot:false},
  {iata:'JNB',icao:'FAOR',name:'O.R. Tambo International',city:'Johannesburg', country:'ZA',flag:'🇿🇦',lat:-26.1367,lng:28.2411,  photos:5640, spotters:178,  hot:false},
  {iata:'SVO',icao:'UUEE',name:'Sheremetyevo',             city:'Moscow',       country:'RU',flag:'🇷🇺',lat:55.9726, lng:37.4146,  photos:11280,spotters:356,  hot:false},
  {iata:'ALA',icao:'UAAA',name:'Almaty International',    city:'Almaty',       country:'KZ',flag:'🇰🇿',lat:43.3521, lng:77.0405,  photos:2180, spotters:87,   hot:false},
  {iata:'PEK',icao:'ZBAA',name:'Beijing Capital',         city:'Beijing',      country:'CN',flag:'🇨🇳',lat:40.0799, lng:116.6031, photos:9120, spotters:298,  hot:false},
  {iata:'DEL',icao:'VIDP',name:'Indira Gandhi International',city:'Delhi',      country:'IN',flag:'🇮🇳',lat:28.5665, lng:77.1031,  photos:8430, spotters:267,  hot:false},
  {iata:'LAX',icao:'KLAX',name:'Los Angeles International',city:'Los Angeles', country:'US',flag:'🇺🇸',lat:33.9425, lng:-118.4081,photos:19200,spotters:601,  hot:true },
];

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

const REGIONS = [
  {name:'Europe',     photos:'142K',airports:487},
  {name:'Middle East',photos:'89K', airports:124},
  {name:'Asia-Pac',   photos:'198K',airports:312},
  {name:'N. America', photos:'167K',airports:421},
  {name:'Africa',     photos:'34K', airports:187},
  {name:'S. America', photos:'28K', airports:198},
];

const LIVE = [
  {airport:'DXB',flag:'🇦🇪',text:'A6-EVC A380 — beautiful late light',spotter:'A. Hassan', time:'3m'},
  {airport:'LHR',flag:'🇬🇧',text:'G-VROM Virgin 747 on 09L',          spotter:'M. Webb',   time:'12m'},
  {airport:'SIN',flag:'🇸🇬',text:'9V-SKA Singapore A380 sunset',       spotter:'K. Tan',    time:'28m'},
  {airport:'IST',flag:'🇹🇷',text:'TC-JJU 737 in new THY livery',       spotter:'E. Yilmaz', time:'41m'},
  {airport:'JFK',flag:'🇺🇸',text:'N829AN AA 787 at T8',                spotter:'T. Wilson', time:'55m'},
];

export const MapPage = ({ focusAirportIata }: { focusAirportIata?: string | null }) => {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMap    = useRef<any>(null);
  const markersLayer  = useRef<any>(null);
  const [selected,    setSelected]  = useState<AirportPoint | null>(null);
  const [search,      setSearch]    = useState('');
  const [filter,      setFilter]    = useState<'all'|'hot'>('all');
  const [mapReady,    setMapReady]  = useState(false);
  const [airports,    setAirports]  = useState<AirportPoint[]>(DEMO_AIRPORTS);
  const [usingDemo,   setUsingDemo] = useState(true);
  const [mapLayer,    setMapLayer]  = useState<'light'|'satellite'|'dark'>('light');
  const tileLayerRef  = useRef<any>(null);

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

    const visible = airports.filter(ap =>
      (filter === 'all' || ap.hot) &&
      (!search || ap.iata.toLowerCase().includes(search.toLowerCase()) ||
       ap.name.toLowerCase().includes(search.toLowerCase()) ||
       ap.city.toLowerCase().includes(search.toLowerCase()))
    );

    visible.forEach(ap => {
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
  }, [filter, search, mapReady, airports]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Read approved photo airport_ids in pages (avoid 1000-row default cap).
        const photoRows: Array<{ airport_id: string | null }> = [];
        const pageSize = 1000;
        const maxRows = 100000;
        for (let offset = 0; offset < maxRows; offset += pageSize) {
          const { data, error } = await supabase
            .from('photos')
            .select('airport_id')
            .eq('status', 'APPROVED')
            .not('airport_id', 'is', null)
            .range(offset, offset + pageSize - 1);
          if (error) {
            console.error('Map photos load:', error);
            break;
          }
          const chunk = (data ?? []) as Array<{ airport_id: string | null }>;
          photoRows.push(...chunk);
          if (chunk.length < pageSize) break;
        }
        if (cancelled) return;

        const counts = new Map<string, number>();
        for (const r of photoRows) {
          const id = r?.airport_id;
          if (!id) continue;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        const airportIds = Array.from(counts.keys());
        if (!airportIds.length) {
          return;
        }

        // 2) Fetch only airports that are actually referenced by approved photos.
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
        if (!apRows.length) return;

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

        // Prefer real DB dataset; fallback stays DEMO_AIRPORTS.
        if (mapped.length > 0) {
          setAirports(mapped);
          setUsingDemo(false);
        }
      } catch (e) {
        console.error('Map load failed:', e);
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

  const q = search.toLowerCase();
  const visible = airports.filter(ap =>
    (filter === 'all' || ap.hot) &&
    (!search ||
      ap.iata.toLowerCase().includes(q) ||
      ap.icao.toLowerCase().includes(q) ||
      ap.name.toLowerCase().includes(q) ||
      ap.city.toLowerCase().includes(q))
  );

  const flyTo = (ap: AirportPoint) => {
    setSelected(ap);
    if (leafletMap.current) {
      leafletMap.current.flyTo([ap.lat, ap.lng], 11, { duration: 1.2 });
    }
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
            {airports.length} airports · tap a dot for details{usingDemo ? ' (demo)' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(['all','hot'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? '#0f172a' : 'transparent',
                color: filter === f ? '#fff' : '#cbd5e1',
                border: filter === f ? '1px solid #0f172a' : '1px solid rgba(226,232,240,0.45)',
              }}
            >
              {f === 'hot' ? '🔥 Hot' : 'All'}
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
                  <div className="flex-1 text-center">
                    <div className="font-mono text-xs font-semibold" style={{ color: '#0ea5e9' }}>{selected.photos.toLocaleString('en-US')}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>photos</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-mono text-xs font-semibold" style={{ color: '#0f172a' }}>{selected.spotters}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>spotters</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-mono text-[10px]" style={{ color: '#64748b' }}>{selected.icao}</div>
                    <div className="text-[10px]" style={{ color: '#94a3b8' }}>ICAO</div>
                  </div>
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

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
          {REGIONS.map(r => (
            <div
              key={r.name}
              className="card shrink-0 px-2.5 py-1.5 text-center"
              style={{ minWidth: '5.5rem' }}
            >
              <div className="font-mono text-xs font-semibold" style={{ color: '#0f172a' }}>{r.photos}</div>
              <div className="text-[10px] font-medium leading-tight" style={{ color: '#0f172a' }}>{r.name}</div>
              <div className="text-[9px]" style={{ color: '#94a3b8' }}>{r.airports} ap.</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="card overflow-hidden lg:col-span-5">
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

          <div className="card p-3 lg:col-span-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>Sample reports</span>
              <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: '#f1f5f9', color: '#94a3b8' }}>Demo</span>
            </div>
            <div className="space-y-2">
              {LIVE.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="text-sm leading-none">{r.flag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="tag text-[9px]">{r.airport}</span>
                      <span style={{ color: '#94a3b8' }}>{r.spotter}</span>
                    </div>
                    <p className="leading-snug" style={{ color: '#475569' }}>{r.text}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 font-mono text-[9px]" style={{ color: '#cbd5e1' }}>
                    <Clock className="h-3 w-3" aria-hidden />{r.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-3 lg:col-span-3">
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
