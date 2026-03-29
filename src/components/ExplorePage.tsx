import { motion } from 'motion/react';
import { Eye, Heart, Camera, Plane, MapPin, ArrowRight, Clock, TrendingUp, Users, Globe2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Page } from '../types';
import React from 'react';

// Photos will be loaded from Supabase after launch
const photos: any[] = [];
const latest: any[] = [];

const stats = [
  { label:'Photos',   value:'847K', icon: Camera  },
  { label:'Aircraft', value:'124K', icon: Plane   },
  { label:'Airports', value:'1,284',icon: MapPin  },
  { label:'Spotters', value:'18.4K',icon: Users   },
  { label:'Airlines', value:'943',  icon: Globe2  },
  { label:'Views',    value:'32M',  icon: Eye     },
];

const FILTERS = ['All','Takeoff','Landing','Static','Night','Air-to-Air'];

export const ExplorePage = ({ onAircraftClick, setCurrentPage }: {
  onAircraftClick: () => void; setCurrentPage: (p: Page) => void;
}) => {
  const [filter, setFilter] = useState('All');

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid #e2e8f0', minHeight: 400 }}>

        {/* SVG Scene: Camel-style silhouettes + 787 Dreamliner contrail */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 460"
          preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            {/* Sky: pre-dawn blue → warm amber horizon */}
            <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#c9dff0"/>
              <stop offset="50%"  stopColor="#f0d9b5"/>
              <stop offset="100%" stopColor="#e8c48a"/>
            </linearGradient>
            {/* Sand layers */}
            <linearGradient id="gSand1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#deb887"/>
              <stop offset="100%" stopColor="#c8955a"/>
            </linearGradient>
            <linearGradient id="gSand2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#c8a06a"/>
              <stop offset="100%" stopColor="#a0784a"/>
            </linearGradient>
            {/* Contrail: transparent → white */}
            <linearGradient id="gTrail" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
              <stop offset="35%"  stopColor="#ffffff" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="gTrail2" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0"/>
              <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6"/>
            </linearGradient>
            <filter id="fBlur3" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3"/>
            </filter>
            <filter id="fBlur6" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6"/>
            </filter>
            <filter id="fBlur1" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1"/>
            </filter>
          </defs>

          {/* ── SKY ── */}
          <rect width="1440" height="460" fill="url(#gSky)"/>

          {/* Sun glow low on right horizon */}
          <ellipse cx="1100" cy="340" rx="220" ry="80"
            fill="#ffe4a0" opacity="0.45" filter="url(#fBlur6)"/>
          <ellipse cx="1100" cy="345" rx="90" ry="40"
            fill="#ffd070" opacity="0.35" filter="url(#fBlur6)"/>

          {/* ─────────────────────────────────────────────────────── */}
          {/* 787-9 DREAMLINER SILHOUETTE                            */}
          {/* Flying upper-right, nose pointing upper-right ~-28 deg */}
          {/* ─────────────────────────────────────────────────────── */}
          <g transform="translate(1080, 62) rotate(-28)" fill="#2d3e50" opacity="0.72">

            {/* Fuselage — long tube, tapered nose & tail */}
            <path d="
              M 120,0
              C 115,-5 100,-7 80,-7
              L -90,-7
              C -105,-7 -118,-4 -124,0
              C -118,4 -105,7 -90,7
              L 80,7
              C 100,7 115,5 120,0 Z"/>

            {/* Nose cone — 787 long pointy nose */}
            <path d="M 120,0 C 135,-2 148,-1 155,0 C 148,1 135,2 120,0 Z"/>

            {/* Main wings — 787 swept, raked wingtip (raked winglets) */}
            {/* Right wing (top in rotated view) */}
            <path d="
              M 30,-7
              L 20,-7
              L -55,-90
              C -58,-95 -52,-98 -48,-93
              L 25,-15
              L 35,-7 Z"/>
            {/* Left wing (bottom) */}
            <path d="
              M 30,7
              L 20,7
              L -55,90
              C -58,95 -52,98 -48,93
              L 25,15
              L 35,7 Z"/>

            {/* Engine nacelle right — GEnx, large diameter */}
            <ellipse cx="-10" cy="-52" rx="18" ry="8"/>
            <path d="M -28,-52 L 8,-52 L 8,-44 L -28,-44 Z" rx="3"/>

            {/* Engine nacelle left */}
            <ellipse cx="-10" cy="52" rx="18" ry="8"/>
            <path d="M -28,52 L 8,52 L 8,44 L -28,44 Z" rx="3"/>

            {/* Pylon right */}
            <path d="M -8,-10 L -14,-44 L -6,-44 L 0,-10 Z" opacity="0.8"/>
            {/* Pylon left */}
            <path d="M -8,10 L -14,44 L -6,44 L 0,10 Z" opacity="0.8"/>

            {/* Horizontal stabiliser */}
            <path d="
              M -100,-7
              L -108,-7
              L -130,-30
              C -133,-33 -129,-36 -126,-33
              L -105,-10
              L -98,-7 Z"/>
            <path d="
              M -100,7
              L -108,7
              L -130,30
              C -133,33 -129,36 -126,33
              L -105,10
              L -98,7 Z"/>

            {/* Vertical tail fin */}
            <path d="
              M -90,0
              L -95,-5
              L -125,-42
              C -127,-46 -122,-48 -120,-44
              L -92,5
              Z"/>
          </g>

          {/* ── CONTRAILS — two parallel trails from 787 → horizon ── */}
          {/* Main contrail — wide, blurred */}
          <path d="M 220,380 Q 520,280 830,165 Q 990,108 1072,70"
            stroke="url(#gTrail)" strokeWidth="10" fill="none"
            strokeLinecap="round" opacity="0.8" filter="url(#fBlur3)"/>
          {/* Second contrail — offset ~14px */}
          <path d="M 232,385 Q 532,286 842,171 Q 1002,114 1084,76"
            stroke="url(#gTrail2)" strokeWidth="5" fill="none"
            strokeLinecap="round" opacity="0.6" filter="url(#fBlur3)"/>
          {/* Thin sharp inner line for realism */}
          <path d="M 226,382 Q 526,283 836,168 Q 996,111 1078,73"
            stroke="white" strokeWidth="1.2" fill="none"
            strokeLinecap="round" opacity="0.35"/>

          {/* ── DUNES ── */}
          {/* Distant haze dune */}
          <path d="M 0,340 Q 200,305 420,328 Q 640,350 860,318 Q 1080,287 1280,310 Q 1380,320 1440,308 L 1440,460 L 0,460 Z"
            fill="#d4a96a" opacity="0.28"/>

          {/* Mid dune */}
          <path d="M 0,360 Q 180,332 380,352 Q 580,372 780,345 Q 980,318 1160,342 Q 1320,362 1440,348 L 1440,460 L 0,460 Z"
            fill="#c8955a" opacity="0.45"/>

          {/* Foreground main dune */}
          <path d="M 0,390 Q 260,358 520,378 Q 780,398 1000,368 Q 1200,340 1440,370 L 1440,460 L 0,460 Z"
            fill="url(#gSand1)" opacity="0.7"/>

          {/* Ground base */}
          <path d="M 0,415 Q 360,400 720,412 Q 1080,424 1440,408 L 1440,460 L 0,460 Z"
            fill="url(#gSand2)" opacity="0.9"/>


          {/* ══ CAMEL SILHOUETTES — emoji rendered as SVG text, perfectly recognizable ══ */}
          {/* Tinted with CSS filter to desaturate and match sand palette */}

          {/* Camel 1 — large, left */}
          <text x="52" y="400" fontSize="110" opacity="0.22"
            style={{filter:'grayscale(1) sepia(1) brightness(0.4)'}}>
            🐪
          </text>

          {/* Camel 2 — medium, further left */}
          <text x="-18" y="410" fontSize="78" opacity="0.16"
            style={{filter:'grayscale(1) sepia(1) brightness(0.4)'}}>
            🐪
          </text>

          {/* Camel 3 — small, right, flipped */}
          <text x="380" y="405" fontSize="62" opacity="0.13"
            transform="scale(-1,1) translate(-824,0)"
            style={{filter:'grayscale(1) sepia(1) brightness(0.4)'}}>
            🐪
          </text>

        </svg>

        {/* Gradient overlay — gentle fade top → bottom for text legibility */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.48) 42%, rgba(255,255,255,0.90) 100%)'
        }}/>
        <div className="relative z-10 max-w-screen-xl mx-auto px-8 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-center gap-2 mb-6 text-xs" style={{ color: '#64748b' }}>
              <div className="live-dot" />
              <span>Live database · updated continuously</span>
            </div>
            <h1 className="font-headline text-5xl font-bold mb-4" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>
              SILKSPOT
            </h1>
            <p className="text-xl mb-10 mx-auto" style={{ color: '#475569', maxWidth: 540, fontWeight: 400 }}>
              Every photo tagged with registration, operator history, technical specs and GPS coordinates.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPage('explore')} className="btn-primary"
                style={{ height: 44, padding: '0 24px', fontSize: 14 }}>
                Start exploring
              </button>
              <button onClick={() => setCurrentPage('upload')} className="btn-secondary"
                style={{ height: 44, padding: '0 24px', fontSize: 14 }}>
                Upload a photo
              </button>
            </div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
          <div className="max-w-screen-xl mx-auto px-8">
            <div className="flex items-stretch overflow-x-auto no-scrollbar">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.label}
                    className="flex items-center gap-3 px-8 py-5 shrink-0"
                    style={{ borderRight: i < stats.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
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

      {/* TRENDING */}
      <section className="px-8 py-14 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 className="font-headline text-2xl font-bold" style={{ color: '#0f172a' }}>
            Trending this week
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-sm px-3 py-1.5 transition-all"
                style={{
                  background: filter === f ? '#0f172a' : '#fff',
                  color:      filter === f ? '#fff' : '#64748b',
                  border:     '1px solid ' + (filter === f ? '#0f172a' : '#e2e8f0'),
                  borderRadius: 6,
                  fontWeight: filter === f ? 500 : 400,
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {photos.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="card cursor-pointer group overflow-hidden"
              onClick={onAircraftClick}>
              <div className="aspect-[4/3] relative overflow-hidden" style={{ borderRadius: '9px 9px 0 0' }}>
                <img src={p.url} alt={p.reg}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  referrerPolicy="no-referrer" />
                <div className="photo-overlay absolute inset-0" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-sm font-semibold mb-0.5" style={{ color: '#fff' }}>{p.reg}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>{p.operator} · {p.type}</div>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
                  <Camera className="w-3 h-3" />{p.spotter}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{p.likes}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LIVE FEED + FEATURES */}
      <section style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="max-w-screen-xl mx-auto px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Feed */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="live-dot" />
              <h2 className="font-headline text-lg font-bold" style={{ color: '#0f172a' }}>Latest uploads</h2>
            </div>
            <div className="space-y-2">
              {latest.map((item, i) => (
                <motion.div key={item.id}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card flex items-center gap-3 p-3 cursor-pointer">
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                    <img src={item.url} alt={item.reg} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{item.reg}</div>
                    <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{item.operator} · <span className="tag">{item.airport}</span></div>
                  </div>
                  <div className="text-xs shrink-0 flex items-center gap-1" style={{ color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>
                    <Clock className="w-3 h-3" />{item.time}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Feature cards */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {[
              { icon: TrendingUp, title:'Fleet Analytics', desc:'Deep dive into airline fleet compositions, aircraft ages, and retirement trends.', page:'stats' as Page },
              { icon: MapPin,     title:'Spotting Guides', desc:'Best locations at 1,200+ airports worldwide with timing and access info.', page:'map' as Page },
            ].map(block => {
              const Icon = block.icon;
              return (
                <div key={block.title} className="card p-6 cursor-pointer group"
                  onClick={() => setCurrentPage(block.page)}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                    <Icon className="w-4 h-4" style={{ color: '#475569' }} />
                  </div>
                  <h4 className="font-headline text-base font-bold mb-2" style={{ color: '#0f172a' }}>{block.title}</h4>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748b' }}>{block.desc}</p>
                  <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#0ea5e9' }}>
                    Learn more <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}

            {/* Top spotters */}
            <div className="card md:col-span-2 p-6">
              <div className="flex items-center justify-between mb-5">
                <h4 className="font-headline text-base font-bold" style={{ color: '#0f172a' }}>Top Spotters</h4>
                <button onClick={() => setCurrentPage('community')}
                  className="text-sm font-medium transition-colors" style={{ color: '#0ea5e9' }}>
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name:'Marcus Webb',   country:'🇬🇧', uploads:5284, rank:'Legend'  },
                  { name:'Yuki Tanaka',   country:'🇯🇵', uploads:3190, rank:'Master'  },
                  { name:'Aziz Karimov',  country:'🇺🇿', uploads:1847, rank:'Expert'  },
                  { name:'Clara Schmidt', country:'🇩🇪', uploads:1203, rank:'Expert'  },
                ].map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs w-4 text-right" style={{ color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace' }}>{i+1}</span>
                    <span style={{ fontSize: 18 }}>{s.country}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{s.name}</div>
                      <div className="text-xs" style={{ color: '#94a3b8' }}>{s.uploads.toLocaleString('en-US')} photos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center" style={{ background: '#fff' }}>
        <div className="max-w-lg mx-auto">
          <h2 className="font-headline text-3xl font-bold mb-4" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>
            Start contributing today.
          </h2>
          <p className="text-base mb-8" style={{ color: '#475569' }}>
            Join 18,000+ spotters helping build the most accurate aviation database on the planet.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setCurrentPage('upload')} className="btn-primary"
              style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Upload a photo</button>
            <button onClick={() => setCurrentPage('fleet')} className="btn-secondary"
              style={{ height: 44, padding: '0 28px', fontSize: 14 }}>Browse fleet database</button>
          </div>
        </div>
      </section>
    </div>
  );
};
