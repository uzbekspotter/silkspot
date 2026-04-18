import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/**
 * Boeing 787–style vertical stabilizer: asymmetric fin with a **sharp tip** (not a semicircle).
 * Leading edge (left): long sweep; trailing (right): straighter; wide root.
 */
const TAIL_PATH =
  'M 44 6 L 10 72 L 7 108 L 10 128 L 22 133 L 70 133 L 80 124 L 85 64 L 44 6 Z';

/** Visual centroid of the fin for logo / initials (viewBox 0 0 100 140). */
const FIN_CENTER = { x: 46, y: 76 };

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
  const hasGrad = !empty && !!preset?.gradient;

  const onLoad = useCallback(() => setImgOk(true), []);
  const onError = useCallback(() => setImgOk(false), []);

  /** 2-letter initials shown when image fails to load. */
  const initials = useMemo(() => {
    if (empty || !airlineName.trim()) return '';
    const words = airlineName.trim().split(/\s+/).filter(w => /[A-Za-z]/.test(w));
    if (words.length === 0) return '';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, [airlineName, empty]);

  const tailFill = empty
    ? '#f1f5f9'
    : hasGrad
    ? `url(#${gradId})`
    : accentColor;

  return (
    <div
      className="tail-collection-card flex w-[88px] print:w-[108px] flex-col items-stretch shrink-0 overflow-hidden bg-white"
      style={{ border: empty ? '2px dashed #cbd5e1' : '1px solid #e2e8f0' }}
    >
      <div
        className="relative flex min-h-[112px] print:min-h-[132px] flex-1 items-center justify-center bg-white"
      >
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
                <stop offset="0%" stopColor={preset.gradient.from} />
                <stop offset="100%" stopColor={preset.gradient.to} />
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

            {/* Airline logo (hidden until loaded) */}
            {logoSrc && !empty ? (
              <image
                href={logoSrc}
                x="10" y="24" width="78" height="78"
                preserveAspectRatio="xMidYMid meet"
                onLoad={onLoad}
                onError={onError}
                style={{ opacity: showLogo ? 1 : 0 }}
              />
            ) : null}

            {/* Initials fallback — shown when logo absent or failed */}
            {!empty && !showLogo && initials ? (
              <text
                x={FIN_CENTER.x}
                y={FIN_CENTER.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.88)"
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
            strokeOpacity={0.12}
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Airline name — max 2 lines, ellipsis */}
      <div
        className="tail-card-name px-1.5 py-2 text-center text-[11px] print:text-[10px] font-medium italic leading-tight"
        style={{ color: '#1e293b', borderTop: '1px solid #e2e8f0' }}
      >
        {empty ? '—' : airlineName}
      </div>
    </div>
  );
}
