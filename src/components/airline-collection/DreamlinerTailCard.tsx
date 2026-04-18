import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/**
 * Two-layer rendering:
 *   1. SVG clipPath filled with airline colour/gradient.
 *   2. 787_Tail.png overlaid with mix-blend-mode:multiply — shows the
 *      authentic pen outline; white PNG areas become transparent over any colour.
 *
 * ─── Path derivation ────────────────────────────────────────────────────────
 * Source PNG: 787_Tail.png  960 × 718 px
 * Anchor pixels (read from image):
 *   ROOT_LE (185, 545)   ROOT_TE (705, 545)
 *   TIP_TE  (742, 120)   TIP_LE  (620, 120)
 *   LE mid-low  (270, 400)          ← S-curve lower arm
 *   LE inflect  (340, 300)          ← S-curve inflection
 *   LE mid-high (470, 200)          ← S-curve upper arm
 *
 * Normalised to viewBox 0 0 100 140 (margins 5px each side):
 *   sx = 90/(742-185) = 0.162   sy = 128/(545-120) = 0.301
 *   ox = 5 - 185×0.162 = -25    oy = 6 - 120×0.301 = -30
 *
 * Resulting anchors:
 *   ROOT_LE (5,134)  ROOT_TE (89,134)  TIP_TE (95,6)  TIP_LE (75,6)
 *
 * LE: compound S-curve split at inflection (30,60):
 *   Seg 1  (5,134)→(30,60):  CP verified at t=0.5 → (19,90) ✓
 *   Seg 2  (30,60)→(75, 6):  CP verified at t=0.5 → (51,30) ✓
 *   (Control-point derivation: set B(0.5)=target, solve CP1x+CP2x / CP1y+CP2y.)
 *
 * TE: L from (95,6) to (89,134) — Δx=6 / Δy=128 → 2.7° from vertical  ✓
 * Taper: tip-chord 20 / root-chord 84 = 0.24  (real 787 ≈ 0.25)        ✓
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
 * Lower-half centroid at y≈100:
 *   LE x ≈ 15, TE x ≈ 91  →  centre x ≈ 53.
 * Matches real livery convention: airline badge sits in lower fin, not dead-centre.
 */
const FIN_CENTER = { x: 53, y: 100 };
const LOGO       = { x: 28, y: 76, w: 50, h: 48 } as const;

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
      <div className="relative flex min-h-[112px] print:min-h-[132px] flex-1 items-center justify-center bg-white">
        <svg viewBox="0 0 100 140" className="h-full w-auto max-w-full" aria-hidden>
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


          {/* ── Layer 1: airline colour clipped to fin shape ──────────────────── */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width="100" height="140"
              fill={tailFill} opacity={empty ? 1 : 0.92} />

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

          {/* Thin stroke outline on top of fill */}
          <path
            d={TAIL_PATH}
            fill="none"
            stroke="#0f172a"
            strokeOpacity={0.15}
            strokeWidth="0.8"
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
