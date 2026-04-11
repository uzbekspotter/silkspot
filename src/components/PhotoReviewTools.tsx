import { motion } from 'motion/react';
import {
  BarChart3, Crosshair, Grid3X3, Layers, Scan, ZoomIn,
  RotateCcw, X, Sliders, Eye, LineChart, Gauge, Sparkles,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import React from 'react';

/** Deterministic stub curves for histogram display only (not a machine verdict). */
interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  luma: number[];
}

function genHistogramStub(url: string): HistogramData {
  let s = 0;
  for (let i = 0; i < url.length; i++) s = (s * 31 + url.charCodeAt(i)) & 0xffffffff;
  const r = (min: number, max: number, off = 0) => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return min + (Math.abs(s + off) % 10000) / 10000 * (max - min);
  };
  const mkH = (peak: number, spread: number) =>
    Array.from({ length: 256 }, (_, i) => {
      const d = (i - peak) / spread;
      return Math.max(0, Math.round(Math.exp(-0.5 * d * d) * 1800 + r(-40, 40, i)));
    });
  const rp = Math.round(r(80, 180)), gp = Math.round(r(85, 175)), bp = Math.round(r(70, 165));
  const rv = mkH(rp, 45), gv = mkH(gp, 48), bv = mkH(bp, 42);
  const luma = Array.from({ length: 256 }, (_, i) => Math.round(rv[i] * 0.299 + gv[i] * 0.587 + bv[i] * 0.114));
  return { r: rv, g: gv, b: bv, luma };
}

function aspectLabel(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  const aw = w / d;
  const ah = h / d;
  return aw > 10 ? `${Math.round((w / h) * 10) / 10}:1` : `${aw}:${ah}`;
}

// ── Histogram mini chart ──────────────────────────────────
const HistBar = ({
  data,
  color,
  label,
  height = 44,
  labelColor = '#94a3b8',
}: {
  data: number[];
  color: string;
  label: string;
  height?: number;
  labelColor?: string;
}) => {
  const mx = Math.max(...data, 1);
  const bars = Array.from({ length: 64 }, (_, i) => Math.max(...data.slice(i * 4, (i + 1) * 4)) / mx);
  return (
    <div>
      <div
        className="text-xs font-medium mb-1"
        style={{ color: labelColor, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {label}
      </div>
      <div className="flex items-end gap-px" style={{ height, background: '#0a0a0a', borderRadius: 6, padding: '3px 3px 0' }}>
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(h * 100, 1)}%`, background: color, opacity: 0.85 }} />
        ))}
      </div>
    </div>
  );
};

/** Compact RGB composite (overlay on preview). */
const RgbHistogramMini = ({ r, g, b }: { r: number[]; g: number[]; b: number[] }) => {
  const W = 256;
  const H = 52;
  const max = Math.max(...r, ...g, ...b, 1);
  const line = (arr: number[]) =>
    arr.map((v, i) => `${(i / (arr.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`).join(' L ');
  const area = (arr: number[]) => `M0,${H} L ${line(arr)} L ${W},${H} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block" aria-hidden>
      <path d={area(b)} fill="rgba(10,132,255,0.18)" stroke="rgba(10,132,255,0.85)" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
      <path d={area(g)} fill="rgba(48,209,88,0.12)" stroke="rgba(48,209,88,0.75)" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
      <path d={area(r)} fill="rgba(255,69,58,0.12)" stroke="rgba(255,69,58,0.75)" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// ── Overlay modes ─────────────────────────────────────────
type Overlay =
  | 'none'
  | 'grid'
  | 'thirds'
  | 'center'
  | 'dust'
  | 'focus'
  | 'horizon'
  | 'histLuma'
  | 'histRgb'
  | 'edges';

const ScreenerToolBtn = ({
  active,
  icon: Icon,
  label,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  title?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={title ?? label}
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
    style={{
      background: active ? '#0f172a' : '#ffffff',
      color: active ? '#ffffff' : '#334155',
      border: `1px solid ${active ? '#0f172a' : '#e2e8f0'}`,
      boxShadow: active ? '0 1px 3px rgba(15,23,42,0.12)' : '0 1px 2px rgba(15,23,42,0.04)',
    }}
  >
    <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
    <span className="whitespace-nowrap">{label}</span>
  </button>
);

// ── Main ──────────────────────────────────────────────────
interface Props {
  photoUrl: string;
  reg: string;
  width: number;
  height: number;
  sizeMb: number;
  metadataScore: number;
  category: string;
  shotDate: string;
  spotter: string;
  onClose?: () => void;
}

type Tab = 'reference' | 'inspect' | 'histogram' | 'duplicates';

export const PhotoReviewTools = ({
  photoUrl,
  reg,
  width,
  height,
  sizeMb,
  metadataScore,
  category,
  shotDate,
  spotter,
  onClose,
}: Props) => {
  const [tab, setTab] = useState<Tab>('reference');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [zoom, setZoom] = useState(1);
  /** Manual horizon guide — screener adjusts to match runway / horizon (no auto angle). */
  const [horizonDeg, setHorizonDeg] = useState(0);

  const [hist, setHist] = useState<HistogramData | null>(null);
  useEffect(() => {
    setHist(genHistogramStub(photoUrl));
  }, [photoUrl]);

  const aspect = useMemo(() => aspectLabel(width, height), [width, height]);

  if (!hist) {
    return (
      <div className="flex items-center justify-center rounded-2xl w-full" style={{ height: 300, background: '#f8fafc' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: '#0ea5e9' }} />
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'reference', label: 'Reference' },
    { id: 'inspect', label: 'Inspect' },
    { id: 'histogram', label: 'Histogram' },
    { id: 'duplicates', label: 'Duplicates' },
  ];

  /** Perceptual-hash / embedding similarity not implemented — keep tab for future wiring. */
  const dupes: { sim: number; reg: string; date: string; spotter: string }[] = [];

  const imgFilter =
    overlay === 'dust'
      ? 'contrast(1.72) saturate(0.32) brightness(1.04)'
      : overlay === 'edges'
        ? 'contrast(1.45) brightness(1.02) saturate(0.95)'
        : undefined;

  return (
    <div className="w-full max-w-none rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #e8e8ed' }}>
      {/* Header — no machine verdict; screener decides via Approve / Reject */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: '#f8fafc', borderBottom: '1px solid #e8e8ed' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Sliders className="w-4 h-4 shrink-0" style={{ color: '#0f172a' }} />
          <span className="font-semibold text-sm tracking-tight truncate" style={{ color: '#0f172a' }}>
            Review Tools
          </span>
          <span className="tag shrink-0" style={{ fontFamily: '"SF Mono", monospace' }}>
            {reg}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: '#94a3b8' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap" style={{ borderBottom: '1px solid #e8e8ed' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-5 py-3 text-sm transition-all"
            style={{
              color: tab === t.id ? '#0f172a' : '#475569',
              borderBottom: tab === t.id ? '2px solid #0f172a' : '2px solid transparent',
              fontWeight: tab === t.id ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Full-width preview row; metadata / tabs content below (was side panel) */}
      <div className="flex flex-col w-full">
        <div className="relative min-h-0 w-full" style={{ background: '#0a0a0a', minHeight: 380 }}>
          <div className="relative overflow-hidden w-full" style={{ minHeight: 380 }}>
            <motion.div
              animate={{ scale: zoom }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full relative"
              style={{ transformOrigin: 'center center' }}
            >
              <div className="w-full h-full" style={imgFilter ? { filter: imgFilter } : undefined}>
                <img
                  src={photoUrl}
                  alt={reg}
                  className="w-full h-full object-contain select-none"
                  style={{ minHeight: 380 }}
                  draggable={false}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Grid */}
              {overlay === 'grid' && (
                <div className="absolute inset-0 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <React.Fragment key={i}>
                      <div className="absolute w-full" style={{ top: `${i * 11.11}%`, height: 1, background: 'rgba(255,255,255,.15)' }} />
                      <div className="absolute h-full" style={{ left: `${i * 11.11}%`, width: 1, background: 'rgba(255,255,255,.15)' }} />
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Rule of thirds */}
              {overlay === 'thirds' && (
                <div className="absolute inset-0 pointer-events-none">
                  {[1, 2].map((i) => (
                    <React.Fragment key={i}>
                      <div className="absolute w-full" style={{ top: `${i * 33.33}%`, height: 1, background: 'rgba(255,200,0,.55)' }} />
                      <div className="absolute h-full" style={{ left: `${i * 33.33}%`, width: 1, background: 'rgba(255,200,0,.55)' }} />
                    </React.Fragment>
                  ))}
                  {[1, 2].flatMap((r) =>
                    [1, 2].map((c) => (
                      <div
                        key={`${r}${c}`}
                        className="absolute w-3 h-3 rounded-full border-2"
                        style={{
                          top: `calc(${r * 33.33}% - 6px)`,
                          left: `calc(${c * 33.33}% - 6px)`,
                          borderColor: 'rgba(255,200,0,.8)',
                        }}
                      />
                    )),
                  )}
                </div>
              )}

              {/* Center */}
              {overlay === 'center' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute w-full" style={{ top: '50%', height: 1, background: 'rgba(0,200,255,.5)' }} />
                  <div className="absolute h-full" style={{ left: '50%', width: 1, background: 'rgba(0,200,255,.5)' }} />
                  {[8, 16, 25, 38].map((r) => (
                    <div
                      key={r}
                      className="absolute rounded-full border"
                      style={{
                        width: `${r * 2}%`,
                        height: `${r * 2}%`,
                        top: `${50 - r}%`,
                        left: `${50 - r}%`,
                        borderColor: 'rgba(0,200,255,.2)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Focus zones — no auto sharpness score */}
              {overlay === 'focus' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute rounded-2xl"
                    style={{
                      top: '18%',
                      left: '18%',
                      right: '18%',
                      bottom: '22%',
                      border: '2px solid rgba(52,199,89,.7)',
                      background: 'rgba(52,199,89,.05)',
                    }}
                  >
                    <div
                      className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: '#34c759', color: '#fff', fontSize: 9 }}
                    >
                      Subject zone
                    </div>
                  </div>
                  {[{ t: '0%', l: '0%' }, { t: '0%', r: '0%' }, { b: '0%', l: '0%' }, { b: '0%', r: '0%' }].map((s, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        ...s,
                        width: '20%',
                        height: '22%',
                        border: '1px solid rgba(255,159,0,.4)',
                        background: 'rgba(255,159,0,.05)',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Horizon guide — manual angle */}
              {overlay === 'horizon' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div
                    style={{
                      width: '160%',
                      height: 2,
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(250,204,21,0.92) 12%, rgba(250,204,21,0.92) 88%, transparent 100%)',
                      transform: `rotate(${-horizonDeg}deg)`,
                      transformOrigin: 'center center',
                      boxShadow: '0 0 14px rgba(250,204,21,0.35)',
                    }}
                  />
                  <div
                    className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-semibold pointer-events-none"
                    style={{
                      background: 'rgba(0,0,0,0.72)',
                      color: '#fde68a',
                      fontFamily: '"SF Mono", monospace',
                      border: '1px solid rgba(250,204,21,0.35)',
                    }}
                  >
                    Guide {horizonDeg > 0 ? '+' : ''}
                    {horizonDeg.toFixed(1)}°
                  </div>
                </div>
              )}

              {overlay === 'histLuma' && (
                <div
                  className="absolute left-2 right-2 bottom-2 rounded-lg p-2 pointer-events-none"
                  style={{
                    background: 'rgba(8,8,10,0.88)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 520,
                    margin: '0 auto',
                  }}
                >
                  <HistBar data={hist.luma} color="#a1a1aa" label="Luminance" height={36} labelColor="#ffffff" />
                </div>
              )}

              {overlay === 'histRgb' && (
                <div
                  className="absolute left-2 right-2 bottom-2 rounded-lg p-2 pt-1 pointer-events-none"
                  style={{
                    background: 'rgba(8,8,10,0.88)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 520,
                    margin: '0 auto',
                  }}
                >
                  <div className="text-[10px] font-medium mb-1" style={{ color: '#ffffff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    RGB composite
                  </div>
                  <RgbHistogramMini r={hist.r} g={hist.g} b={hist.b} />
                </div>
              )}
            </motion.div>
          </div>

          <div
            className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)' }}
          >
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              style={{
                color: '#fff',
                opacity: zoom > 1 ? 1 : 0.4,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              −
            </button>
            <span style={{ color: '#fff', fontFamily: '"SF Mono", monospace', fontSize: 11, minWidth: 34, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              style={{
                color: '#fff',
                opacity: zoom < 4 ? 1 : 0.4,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              +
            </button>
            {zoom > 1 && (
              <button onClick={() => setZoom(1)} style={{ color: '#ffffff', opacity: 0.85, marginLeft: 2 }}>
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Screener tools */}
          <div className="border-t px-4 py-4" style={{ borderColor: '#1f2937', background: '#0f172a' }}>
            <p className="text-xs leading-relaxed mb-3" style={{ color: '#cbd5e1' }}>
              Visual QC only — rotate the horizon guide and use overlays to judge dust, level, framing, and sharpness. Nothing here is an automatic accept/reject.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest w-full sm:w-auto sm:mr-1" style={{ color: '#94a3b8' }}>
                  Screening
                </span>
                <ScreenerToolBtn
                  active={overlay === 'dust'}
                  icon={Scan}
                  label="Spot boost"
                  title="High contrast — scan sensor dust visually (no auto detection)"
                  onClick={() => setOverlay(overlay === 'dust' ? 'none' : 'dust')}
                />
                <ScreenerToolBtn
                  active={overlay === 'horizon'}
                  icon={Gauge}
                  label="Horizon"
                  title="Align the yellow guide with the horizon (adjust angle in Inspect tab)"
                  onClick={() => setOverlay(overlay === 'horizon' ? 'none' : 'horizon')}
                />
                <ScreenerToolBtn
                  active={overlay === 'center'}
                  icon={Crosshair}
                  label="Center"
                  title="Center cross + rings"
                  onClick={() => setOverlay(overlay === 'center' ? 'none' : 'center')}
                />
                <ScreenerToolBtn
                  active={overlay === 'edges'}
                  icon={Sparkles}
                  label="Sharpness"
                  title="Local contrast boost to judge edge acuity"
                  onClick={() => setOverlay(overlay === 'edges' ? 'none' : 'edges')}
                />
                <ScreenerToolBtn
                  active={overlay === 'histLuma'}
                  icon={BarChart3}
                  label="Histogram"
                  title="Luminance histogram on preview"
                  onClick={() => setOverlay(overlay === 'histLuma' ? 'none' : 'histLuma')}
                />
                <ScreenerToolBtn
                  active={overlay === 'histRgb'}
                  icon={LineChart}
                  label="RGB"
                  title="RGB channels overlaid"
                  onClick={() => setOverlay(overlay === 'histRgb' ? 'none' : 'histRgb')}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest w-full sm:w-auto sm:mr-1" style={{ color: '#94a3b8' }}>
                  Composition
                </span>
                <ScreenerToolBtn active={overlay === 'none'} icon={Eye} label="Clear" title="Remove overlays" onClick={() => setOverlay('none')} />
                <ScreenerToolBtn active={overlay === 'grid'} icon={Grid3X3} label="Grid" onClick={() => setOverlay(overlay === 'grid' ? 'none' : 'grid')} />
                <ScreenerToolBtn active={overlay === 'thirds'} icon={Layers} label="Thirds" onClick={() => setOverlay(overlay === 'thirds' ? 'none' : 'thirds')} />
                <ScreenerToolBtn
                  active={overlay === 'focus'}
                  icon={ZoomIn}
                  label="Subject zone"
                  onClick={() => setOverlay(overlay === 'focus' ? 'none' : 'focus')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reference / Inspect / Histogram / Duplicates — below preview, full width */}
        <div className="w-full overflow-y-auto min-h-0 border-t" style={{ borderColor: '#e8e8ed', maxHeight: 'min(55vh, 720px)' }}>
          {tab === 'reference' && (
            <div className="p-4">
              <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.1em' }}>
                File & submission
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: '#64748b' }}>
                Factual data only. Pass or reject is your call — there is no automated score.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[
                  { label: 'Dimensions', value: `${width.toLocaleString('en-US')} × ${height.toLocaleString('en-US')} px` },
                  { label: 'Aspect', value: aspect },
                  { label: 'File size', value: `${sizeMb.toFixed(2)} MB` },
                  { label: 'Category', value: category },
                  { label: 'Shot date', value: shotDate },
                  { label: 'Spotter', value: spotter },
                  { label: 'Metadata score', value: `${metadataScore}/100 (form completeness)` },
                ].map((row) => (
                  <div key={row.label} className="rounded-xl px-3 py-2.5" style={{ background: '#f8fafc', border: '1px solid #e8e8ed' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: '#94a3b8' }}>
                      {row.label}
                    </div>
                    <div className="text-sm" style={{ color: '#0f172a', fontFamily: row.label === 'Dimensions' || row.label === 'Aspect' ? '"SF Mono", monospace' : undefined }}>
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'inspect' && (
            <div className="p-4 space-y-5">
              <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: '#f8fafc', border: '1px solid #e8e8ed', color: '#475569' }}>
                Overlays are under the preview. Use <strong style={{ color: '#0f172a' }}>Spot boost</strong> for dust,{' '}
                <strong style={{ color: '#0f172a' }}>Horizon</strong> with the slider below, <strong style={{ color: '#0f172a' }}>Center</strong> /{' '}
                <strong style={{ color: '#0f172a' }}>Thirds</strong> for framing, and <strong style={{ color: '#0f172a' }}>Sharpness</strong> to stress edges.
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium" style={{ color: '#0f172a' }}>
                    Horizon guide angle
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: '#64748b', fontFamily: '"SF Mono", monospace' }}>
                    {horizonDeg > 0 ? '+' : ''}
                    {horizonDeg.toFixed(1)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.1}
                  value={horizonDeg}
                  onChange={(e) => setHorizonDeg(parseFloat(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: '#94a3b8' }}>
                  <span>−8°</span>
                  <span>Turn on Horizon overlay to see the guide</span>
                  <span>+8°</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'histogram' && (
            <div className="p-4">
              <p className="text-xs mb-4" style={{ color: '#64748b' }}>
                Shapes are illustrative (derived from a stub), for layout reference until a real histogram is wired. Does not judge exposure.
              </p>
              <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '0.1em' }}>
                Channels
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <HistBar data={hist.luma} color="#888" label="Luminance" />
                <HistBar data={hist.r} color="#ff453a" label="Red" />
                <HistBar data={hist.g} color="#30d158" label="Green" />
                <HistBar data={hist.b} color="#0a84ff" label="Blue" />
              </div>
            </div>
          )}

          {tab === 'duplicates' && (
            <div className="p-4 space-y-3">
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                Automatic near-duplicate detection (pHash, embeddings, or server-side similarity) is not enabled yet. When it ships, candidate matches for{' '}
                <span className="font-mono font-medium" style={{ color: '#0f172a' }}>{reg}</span>
                {' '}will appear here.
              </p>
              {dupes.length === 0 ? null : (
                <div className="space-y-2">
                  {dupes.map((d, i) => {
                    const color = d.sim > 90 ? '#dc2626' : d.sim > 75 ? '#d97706' : '#16a34a';
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e8e8ed' }}>
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs"
                          style={{ background: '#0f172a', color: '#fff', fontFamily: '"SF Mono", monospace' }}
                        >
                          {d.reg.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{d.reg}</div>
                          <div className="text-xs" style={{ color: '#94a3b8' }}>{d.date} · {d.spotter}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold" style={{ color, fontFamily: '"SF Mono", monospace' }}>{d.sim}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
