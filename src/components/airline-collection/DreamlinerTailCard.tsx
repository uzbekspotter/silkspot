import { useId, useMemo, useState, useCallback } from 'react';
import type { TailPreset } from '../../lib/airline-tail-presets';

/** Stylized 787 rear-fin silhouette (single path, portrait card). */
const TAIL_PATH =
  'M 50 6 C 32 10 18 26 14 46 L 8 118 Q 6 128 14 134 L 86 134 Q 94 128 92 118 L 86 46 C 82 26 68 10 50 6 Z';

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
                x="12" y="28" width="76" height="76"
                preserveAspectRatio="xMidYMid meet"
                onLoad={onLoad}
                onError={onError}
                style={{ opacity: showLogo ? 1 : 0 }}
              />
            ) : null}

            {/* Initials fallback — shown when logo absent or failed */}
            {!empty && !showLogo && initials ? (
              <text
                x="50" y="78"
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
                x="50" y="78"
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
