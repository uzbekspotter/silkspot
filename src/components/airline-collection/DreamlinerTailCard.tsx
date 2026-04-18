import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/**
 * Vertical stabiliser — normalised from user-supplied reference path.
 *
 * Reference (landscape SVG, bbox 367×123):
 *   ROOT_LE (124,151)  ROOT_TE (397,160)  TIP_TE (491,37)  TIP_LE (409,40)
 *
 * Scale applied to fit portrait card viewBox 0 0 100 140:
 *   sx = 84/367 ≈ 0.229   (x: maps 124–491 → 8–92)
 *   sy = 126/123 ≈ 1.024  (y: maps 37–160 → 8–134)
 *
 * Resulting sweep angles (derived, not guessed):
 *   LE (Z auto-close, TIP_LE→ROOT_LE): Δx=65 / Δy=114 → ~30° from vertical
 *   TE (straight L line): Δx=21 / Δy=126 → ~9° from vertical
 *   Taper ratio: tip chord 19u / root chord 63u ≈ 0.30
 *
 * ROOT_LE  = (8,  125)  ROOT_TE  = (71, 134)
 * TIP_TE   = (92,  8)   TIP_LE   = (73,  11)
 * Root chord slopes 9u (fuselage belly angle). Tip chord: 19u wide.
 * Z-closed LE is straight — correct for this class of swept fin.
 */
const TAIL_PATH = [
  'M 8 125',                // ROOT_LE — root, leading-edge side (lower-left)
  'C 8 125 55 128 71 134',  // ROOT CHORD — curved base, belly angle
  'L 92 8',                 // TRAILING EDGE — near-vertical (9° from vert.)
  'C 92 8 79 11 73 11',     // TIP — short curved chord at fin apex
  'Z',                      // LEADING EDGE — straight close (30° from vert.)
].join(' ');

/**
 * Lower-fin centroid — logo / initials placed in the lower half of the fin,
 * matching real livery practice (badge below fin mid-span).
 *
 * At y=97: fin spans x≈20 (LE) to x≈79 (TE), center ≈ x=49.
 */
const FIN_CENTER = { x: 49, y: 97 };

/** Logo image box centred on FIN_CENTER. */
const LOGO = { x: 24, y: 72, w: 50, h: 50 } as const;

type Props = {
  airlineName: string;
  /** Resolved image URL (already passed through `resolveAirlineLogoSrc` if desired). */
  logoSrc?: string;
  /** Fallback fill when no logo */
  accentColor: string;
  /** Optional branded gradient preset. Overrides solid accentColor fill. */
  preset?: TailPreset;
  empty?: boolean;
};

export function DreamlinerTailCard({
  airlineName,
  logoSrc,
  accentColor,
  preset,
  empty = false,
}: Props) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `tail-clip-${safeUid}`;
  const gradId = `tail-grad-${safeUid}`;

  const [imgOk, setImgOk] = useState(false);

  const showLogo = !empty && !!logoSrc && imgOk;
  const hasGrad  = !empty && !!preset?.gradient;

  const onLoad  = useCallback(() => setImgOk(true),  []);
  const onError = useCallback(() => setImgOk(false), []);

  /** 2-letter initials shown when logo is absent or failed to load. */
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
        <svg
          viewBox="0 0 100 140"
          className="h-full w-auto max-w-full"
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

          <g clipPath={`url(#${clipId})`}>
            {/* Tail body fill */}
            <rect
              x="0" y="0" width="100" height="140"
              fill={tailFill}
              opacity={empty ? 1 : 0.92}
            />

            {/* Airline logo — hidden via opacity until <image> fires onLoad */}
            {logoSrc && !empty ? (
              <image
                href={logoSrc}
                x={LOGO.x} y={LOGO.y} width={LOGO.w} height={LOGO.h}
                preserveAspectRatio="xMidYMid meet"
                onLoad={onLoad}
                onError={onError}
                style={{ opacity: showLogo ? 1 : 0 }}
              />
            ) : null}

            {/* Initials fallback — lower-fin badge position */}
            {!empty && !showLogo && initials ? (
              <text
                x={FIN_CENTER.x}
                y={FIN_CENTER.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.90)"
                fontSize="20"
                fontWeight="700"
                fontFamily='"B612", system-ui, sans-serif'
              >
                {initials}
              </text>
            ) : null}

            {/* Empty slot placeholder */}
            {empty ? (
              <text
                x={FIN_CENTER.x}
                y={FIN_CENTER.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize="22"
                fontFamily="system-ui, sans-serif"
              >
                ?
              </text>
            ) : null}
          </g>

          {/* Outline stroke on top of fill */}
          <path
            d={TAIL_PATH}
            fill="none"
            stroke="#0f172a"
            strokeOpacity={0.14}
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Airline name — max 2 lines, ellipsis via .tail-card-name */}
      <div
        className="tail-card-name px-1.5 py-2 text-center text-[11px] print:text-[10px] font-medium italic leading-tight"
        style={{ color: '#1e293b', borderTop: '1px solid #e2e8f0' }}
      >
        {empty ? '—' : airlineName}
      </div>
    </div>
  );
}
