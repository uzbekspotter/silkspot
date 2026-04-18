import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/**
 * Rendering strategy — close-up crop style (Airhex-inspired):
 *   preserveAspectRatio="xMidYMid slice" on viewBox 0 0 100 140 fills the
 *   card container edge-to-edge (scale=0.88), clipping the fin root ~5px below
 *   the card bottom and leaving the LE just 4px from the left edge.
 *
 *   Layer 0 — full-card rect at 45% opacity (outside-fin tint).
 *   Layer 1 — same rect at 100% opacity, clipped to fin shape (vivid livery).
 *   Layer 2 — white fin outline stroke for the silhouette boundary.
 *
 * ─── Path derivation ────────────────────────────────────────────────────────
 * Source PNG: 787_Tail.png  960 × 718 px
 * Normalised to viewBox 0 0 100 140:
 *   ROOT_LE (5,134)  ROOT_TE (89,134)  TIP_TE (95,6)  TIP_LE (75,6)
 * LE S-curve via two cubics, inflection at (30,60); TE 2.7° from vertical.
 * Taper: 20/84 = 0.24 ≈ real 787 0.25  ✓
 * ─────────────────────────────────────────────────────────────────────────────
 */
const TAIL_PATH = [
  'M 5 134',              // ROOT_LE — base, leading edge
  'C 6 108 33 67 30 60',  // LE seg-1: nearly vertical at root → inflection
  'C 27 53 74 5 75 6',    // LE seg-2: inflection → TIP_LE  (sweeps aft)
  'Q 85 3 95 6',          // TIP: rounded short chord  (TIP_LE → TIP_TE)
  'L 89 134',             // TRAILING EDGE: 2.7° from vertical
  'Z',                    // ROOT CHORD: auto-close ROOT_TE(89,134)→ROOT_LE(5,134)
].join(' ');

/**
 * With slice at scale=0.88, visible y range ≈ 0–127 (SVG coords).
 * At y=90: LE ≈ x=15, TE ≈ x=90 → centre x=52.  Logo sits mid-fin.
 */
const FIN_CENTER = { x: 54, y: 90 };
const LOGO       = { x: 28, y: 55, w: 50, h: 48 } as const;

type Props = {
  airlineName: string;
  logoSrc?: string;
  accentColor: string;
  preset?: TailPreset;
  empty?: boolean;
};

export function DreamlinerTailCard({
  airlineName, logoSrc, accentColor, preset, empty = false,
}: Props) {
  const uid     = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId  = `tail-clip-${safeUid}`;
  const gradId  = `tail-grad-${safeUid}`;

  const [imgOk, setImgOk] = useState(false);
  const showLogo = !empty && !!logoSrc && imgOk;
  const hasGrad  = !empty && !!preset?.gradient;

  const onLoad  = useCallback(() => setImgOk(true),  []);
  const onError = useCallback(() => setImgOk(false), []);

  const initials = useMemo(() => {
    if (empty || !airlineName.trim()) return '';
    const words = airlineName.trim().split(/\s+/).filter(w => /[A-Za-z]/.test(w));
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, [airlineName, empty]);

  const tailFill = empty ? '#f1f5f9' : hasGrad ? `url(#${gradId})` : accentColor;

  return (
    <div
      className="tail-collection-card flex w-[88px] print:w-[108px] flex-col items-stretch shrink-0 overflow-hidden bg-white"
      style={{ border: empty ? '2px dashed #cbd5e1' : '1px solid #e2e8f0' }}
    >
      <div className="relative flex-1 min-h-[112px] print:min-h-[132px] overflow-hidden">
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
          aria-hidden
        >
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <path d={TAIL_PATH} />
            </clipPath>
            {hasGrad && preset?.gradient && (
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={preset.gradient.from} />
                <stop offset="100%" stopColor={preset.gradient.to}   />
              </linearGradient>
            )}
          </defs>

          {/* ── Layer 0: full-card background tint (outside fin = dimmed colour) ── */}
          <rect x="0" y="0" width="100" height="140"
            fill={empty ? '#f8fafc' : tailFill}
            fillOpacity={empty ? 1 : 0.45}
          />

          {/* ── Layer 1: fin fill — full opacity, clipped to fin silhouette ── */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width="100" height="140"
              fill={tailFill}
            />

            {logoSrc && !empty ? (
              <image
                href={logoSrc}
                x={LOGO.x} y={LOGO.y} width={LOGO.w} height={LOGO.h}
                preserveAspectRatio="xMidYMid meet"
                onLoad={onLoad} onError={onError}
                style={{ opacity: showLogo ? 1 : 0 }}
              />
            ) : null}

            {!empty && !showLogo && initials ? (
              <text
                x={FIN_CENTER.x} y={FIN_CENTER.y}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.90)"
                fontSize="20" fontWeight="700"
                fontFamily='"B612", system-ui, sans-serif'
              >
                {initials}
              </text>
            ) : null}

            {empty ? (
              <text
                x={FIN_CENTER.x} y={FIN_CENTER.y}
                textAnchor="middle" dominantBaseline="middle"
                fill="#94a3b8" fontSize="22" fontFamily="system-ui, sans-serif"
              >
                ?
              </text>
            ) : null}
          </g>

          {/* ── Layer 2: fin silhouette outline ── */}
          <path
            d={TAIL_PATH}
            fill="none"
            stroke={empty ? '#cbd5e1' : 'rgba(255,255,255,0.45)'}
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div
        className="tail-card-name px-1.5 py-2 text-center text-[11px] print:text-[10px] font-medium italic leading-tight"
        style={{ color: '#1e293b', borderTop: '1px solid #e2e8f0' }}
      >
        {empty ? '—' : airlineName}
      </div>
    </div>
  );
}
