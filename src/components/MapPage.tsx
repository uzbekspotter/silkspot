import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Clock, Zap, MapPin, Camera, Users,
  ChevronRight, Globe2, Eye
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import React from 'react';
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
          width:${size}px; height:${size}px; border-radius:50%;
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
        const [{ data: apRows, error: apErr }, { data: photoRows, error: phErr }] = await Promise.all([
          supabase
            .from('airports')
            .select('id, iata, icao, name, city, country_code, lat, lng, photo_count, spotter_count')
            .not('iata', 'is', null)
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .limit(20000),
          supabase
            .from('photos')
            .select('airport_id')
            .eq('status', 'APPROVED')
            .not('airport_id', 'is', null)
            .limit(50000),
        ]);
        if (cancelled) return;
        if (apErr || !apRows?.length) {
          if (apErr) console.error('Map airports load:', apErr);
          return;
        }
        if (phErr) console.error('Map photos load:', phErr);

        const counts = new Map<string, number>();
        (photoRows ?? []).forEach((r: any) => {
          const id = r?.airport_id as string | null;
          if (!id) return;
          counts.set(id, (counts.get(id) || 0) + 1);
        });

        const mapped: AirportPoint[] = (apRows as any[]).map((a) => {
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
    const ap = airports.find(x => x.iata.toUpperCase() === code);
    if (ap) flyTo(ap);
  }, [focusAirportIata, mapReady, airports]);

  const visible = airports.filter(ap =>
    (filter === 'all' || ap.hot) &&
    (!search || ap.iata.toLowerCase().includes(search.toLowerCase()) ||
     ap.name.toLowerCase().includes(search.toLowerCase()) ||
     ap.city.toLowerCase().includes(search.toLowerCase()))
  );

  const flyTo = (ap: AirportPoint) => {
    setSelected(ap);
    if (leafletMap.current) {
      leafletMap.current.flyTo([ap.lat, ap.lng], 11, { duration: 1.2 });
    }
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ background:'#fff', minHeight:'100vh' }}>

      {/* Pulse animation for hot airports */}
      <style>{`
        @keyframes pulse-map {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.4); opacity:.6; }
        }
        .leaflet-container { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif; }
        .leaflet-popup-content-wrapper { border-radius:14px!important; box-shadow:0 8px 30px rgba(0,0,0,0.12)!important; }
        .leaflet-popup-tip-container { display:none; }
        .leaflet-control-zoom a { border-radius:8px!important; }
      `}</style>

      {/* Header */}
      <section style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
        <div className="site-w py-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color:'#94a3b8', fontSize:11, letterSpacing:'0.05em' }}>Atlas</div>
            <h1 className="font-headline text-4xl font-bold tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.02em' }}>Airport Map</h1>
            <p className="text-sm mt-1" style={{ color:'#475569' }}>
              {airports.length} airports · click any dot to view details
              {usingDemo ? ' (demo)' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(['all','hot'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-sm px-4 py-2 rounded-full transition-all font-medium"
                style={{ background: filter===f ? '#0f172a' : 'transparent', color: filter===f ? '#fff' : '#475569', border: filter===f ? 'none' : '1px solid #e8e8ed' }}>
                {f === 'hot' ? '🔥 Hot now' : 'All airports'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="site-w py-8 grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Map */}
        <div className="xl:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden" style={{ height: 560, border: '1px solid #e2e8f0', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            {/* Leaflet container */}
            <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

            {/* Loading overlay */}
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: '#f8fafc' }}>
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
                    style={{ borderColor:'#e2e8f0', borderTopColor:'#0ea5e9' }} />
                  <div className="text-sm" style={{ color:'#94a3b8' }}>Loading map…</div>
                </div>
              </div>
            )}

            {/* Selected popup overlay */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity:0, scale:0.95, y:6 }}
                  animate={{ opacity:1, scale:1, y:0 }}
                  exit={{ opacity:0, scale:0.95 }}
                  className="absolute z-[1000] rounded-2xl overflow-hidden"
                  style={{ top:16, left:16, width:240, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)', border:'1px solid #e2e8f0', boxShadow:'0 8px 30px rgba(0,0,0,0.12)' }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span style={{ fontSize:20 }}>{selected.flag}</span>
                          <span className="font-bold text-xl tracking-tight" style={{ color:'#0f172a', fontFamily:'"SF Mono",monospace', letterSpacing:'-0.01em' }}>{selected.iata}</span>
                          {selected.hot && <span style={{ fontSize:14 }}>🔥</span>}
                        </div>
                        <div className="text-xs" style={{ color:'#475569' }}>{selected.name}</div>
                        <div className="text-xs mt-0.5" style={{ color:'#94a3b8' }}>{selected.city}</div>
                      </div>
                      <button onClick={() => setSelected(null)} className="p-1 rounded-lg shrink-0" style={{ color:'#94a3b8' }}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4 py-2.5 mb-3" style={{ borderTop:'1px solid #f5f5f7', borderBottom:'1px solid #f5f5f7' }}>
                      <div className="text-center flex-1">
                        <div className="text-sm font-semibold" style={{ color:'#0ea5e9', fontFamily:'"SF Mono",monospace' }}>{selected.photos.toLocaleString('en-US')}</div>
                        <div className="text-xs" style={{ color:'#94a3b8' }}>photos</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-sm font-semibold" style={{ color:'#0f172a', fontFamily:'"SF Mono",monospace' }}>{selected.spotters}</div>
                        <div className="text-xs" style={{ color:'#94a3b8' }}>spotters</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-xs" style={{ color:'#94a3b8', fontFamily:'"SF Mono",monospace' }}>{selected.icao}</div>
                        <div className="text-xs" style={{ color:'#94a3b8' }}>ICAO</div>
                      </div>
                    </div>
                    <button onClick={() => {
                      if (leafletMap.current && selected) leafletMap.current.flyTo([selected.lat, selected.lng], 14, { duration: 1 });
                    }} className="btn-primary w-full justify-center text-xs" style={{ height:34, fontSize:12 }}>
                      Zoom In →
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid #e8e8ed' }}>
              {[{color:'#ff3b30',label:'Hot now'},{color:'#0f172a',label:'Active'}].map(l=>(
                <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color:'#475569' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background:l.color }}/>
                  {l.label}
                </div>
              ))}
              <div className="text-xs" style={{ color:'#94a3b8' }}>Size = photo count</div>
            </div>

            {/* Layer switch */}
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-1.5 p-1.5 rounded-xl"
              style={{ background:'rgba(255,255,255,0.92)', backdropFilter:'blur(8px)', border:'1px solid #e8e8ed' }}>
              {([
                { id: 'light' as const, label: 'Light' },
                { id: 'satellite' as const, label: 'Satellite' },
                { id: 'dark' as const, label: 'Dark' },
              ]).map(layer => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setTileLayer(layer.id)}
                  className="text-xs px-2.5 py-1 rounded-lg"
                  style={{
                    background: mapLayer === layer.id ? '#0f172a' : '#fff',
                    color: mapLayer === layer.id ? '#fff' : '#475569',
                    border: mapLayer === layer.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  }}>
                  {layer.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {REGIONS.map(r => (
              <div key={r.name} className="card p-3 text-center">
                <div className="text-sm font-semibold tracking-tight mb-0.5" style={{ color:'#0f172a', fontFamily:'"SF Mono",monospace', letterSpacing:'-0.01em' }}>{r.photos}</div>
                <div className="text-xs font-medium" style={{ color:'#0f172a' }}>{r.name}</div>
                <div className="text-xs" style={{ color:'#94a3b8' }}>{r.airports} airports</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="xl:col-span-4 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color:'#94a3b8' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search airports, cities…" style={{ paddingLeft:44 }}/>
            {search && <X className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer" style={{ color:'#94a3b8' }} onClick={() => setSearch('')}/>}
          </div>

          {/* Airport list */}
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ background:'#f8fafc', borderBottom:'1px solid #f5f5f7' }}>
              <span className="text-xs font-medium uppercase tracking-widest"
                style={{ color:'#94a3b8', fontSize:10, letterSpacing:'0.08em' }}>Airports</span>
              <span className="text-xs" style={{ color:'#94a3b8', fontFamily:'"SF Mono",monospace' }}>{visible.length}</span>
            </div>
            <div className="overflow-y-auto no-scrollbar" style={{ maxHeight:220 }}>
              {visible.map(ap => (
                <button key={ap.iata} onClick={() => flyTo(ap)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ borderBottom:'1px solid #f5f5f7', background: selected?.iata===ap.iata ? 'rgba(14,165,233,0.05)' : 'transparent' }}
                  onMouseEnter={e => { if (selected?.iata!==ap.iata) e.currentTarget.style.background='#f8fafc'; }}
                  onMouseLeave={e => { if (selected?.iata!==ap.iata) e.currentTarget.style.background='transparent'; }}>
                  <span style={{ fontSize:18 }}>{ap.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="tag">{ap.iata}</span>
                      <span className="text-sm font-medium truncate" style={{ color:'#0f172a' }}>{ap.city}</span>
                      {ap.hot && <span style={{ fontSize:12 }}>🔥</span>}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color:'#94a3b8' }}>{ap.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium" style={{ color:'#0ea5e9', fontFamily:'"SF Mono",monospace' }}>{ap.photos.toLocaleString('en-US')}</div>
                    <div className="text-xs" style={{ color:'#94a3b8' }}>photos</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live reports */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>Sample Reports</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background:'#f8fafc', color:'#94a3b8' }}>Demo</span>
            </div>
            <div className="space-y-3">
              {LIVE.map((r,i) => (
                <div key={i} className="flex items-start gap-3">
                  <span style={{ fontSize:16 }}>{r.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="tag">{r.airport}</span>
                      <span className="text-xs" style={{ color:'#94a3b8' }}>{r.spotter}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color:'#475569' }}>{r.text}</p>
                  </div>
                  <span className="text-xs shrink-0 flex items-center gap-1"
                    style={{ color:'#cbd5e1', fontFamily:'"SF Mono",monospace' }}>
                    <Clock className="w-3 h-3"/>{r.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top airports by photos */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-4 tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>Top by Photos</h3>
            {[...airports].sort((a,b) => b.photos - a.photos).slice(0,5).map((ap,i) => (
              <button key={ap.iata} onClick={() => flyTo(ap)}
                className="w-full flex items-center gap-3 py-2.5 transition-colors"
                style={{ borderBottom: i<4 ? '1px solid #f5f5f7' : 'none' }}>
                <span className="text-xs w-4 text-right" style={{ color:'#e2e8f0', fontFamily:'"SF Mono",monospace' }}>{i+1}</span>
                <span style={{ fontSize:16 }}>{ap.flag}</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="tag">{ap.iata}</span>
                  <span className="text-xs truncate" style={{ color:'#475569' }}>{ap.name}</span>
                </div>
                <span className="text-xs font-medium shrink-0" style={{ color:'#0f172a', fontFamily:'"SF Mono",monospace' }}>{ap.photos.toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
