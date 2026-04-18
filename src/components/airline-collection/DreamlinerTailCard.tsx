import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/**
 * Vertical stabiliser silhouette — side view, viewBox 0 0 100 140.
 *
 * Proportions (normalised from real 787 geometry, scaled to fit card width):
 *
 *   Fin span (y): 112 u  (TIP y=8 → ROOT y=120, then fillet to y=134)
 *   Root chord:   75 u   (ROOT_LE x=10 → ROOT_TE x=85)
 *   Tip chord:    26 u   (TIP_LE  x=44 → TIP_TE  x=70)
 *   Taper ratio:  26/75 ≈ 0.35   (real 787 ≈ 0.25; relaxed for card width)
 *
 *   LE sweep:  (44−10)/112 ≈ 17° from vertical
 *              (real 787 ≈ 35°; capped by 100-unit viewBox width)
 *   TE sweep:  (85−70)/112 ≈  8° forward lean toward tip — near-vertical,
 *              distinctly less swept than LE → asymmetric, not a tombstone.
 *
 *   Tip: short horizontal chord (Z auto-closes TIP_TE → TIP_LE).
 *   Root: fuselage fillet via two quadratic beziers through y=134.
 *
 * Logo / initials anchor: FIN_CENTER (50, 88) — lower-half of fin,
 *   matching real aircraft livery practice where the badge sits low on the fin.
 */
const TAIL_PATH = [
  'M 44 8',               // TIP_LE   — leading-edge tip  (top-left of fin)
  'C 29 36 13 76 10 120', // LEADING EDGE: strongly swept cubic (17° from vert.)
  'Q 10 130 22 134',      // ROOT_FILLET_LE: fuselage blend, forward side
  'L 76 134',             // FUSELAGE ROOT: straight bottom (root chord base)
  'Q 88 130 85 120',      // ROOT_FILLET_TE: fuselage blend, aft side
  'C 82 88 74 44 70 8',   // TRAILING EDGE: near-vertical cubic (~8° fwd lean)
  'Z',                    // tip chord auto-closes: TIP_TE (70,8) → TIP_LE (44,8)
].join(' ');

/**
 * Lower-half centroid — logo and initials placed here, not at geometric centre,
 * to match the convention where airline badges occupy the lower fin area.
 */
const FIN_CENTER = { x: 50, y: 88 };

/**
 * Logo image box: 52 × 52 u centred on FIN_CENTER (x=24, y=62).
 * At y=62: fin LE ≈ x=28, TE ≈ x=77 → logo (24–76) fits with minor LE clip.
 * At y=114: fin LE ≈ x=12, TE ≈ x=84 → logo fully inside.
 */
const LOGO = { x: 24, y: 62, w: 52, h: 52 } as const;

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
                fontSize="22"
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
