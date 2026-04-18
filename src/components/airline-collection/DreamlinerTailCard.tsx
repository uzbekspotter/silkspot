import { useId, useMemo, useState, useCallback } from 'react';

/** Stylized 787 rear-fin silhouette (single path, portrait card). */
const TAIL_PATH =
  'M 50 6 C 32 10 18 26 14 46 L 8 118 Q 6 128 14 134 L 86 134 Q 94 128 92 118 L 86 46 C 82 26 68 10 50 6 Z';

type Props = {
  airlineName: string;
  /** Resolved image URL (already passed through `resolveAirlineLogoSrc` if desired). */
  logoSrc?: string;
  /** Fallback fill when no logo */
  accentColor: string;
  empty?: boolean;
};

export function DreamlinerTailCard({
  airlineName,
  logoSrc,
  accentColor,
  empty = false,
}: Props) {
  const uid = useId();
  const clipId = `tail-clip-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [imgOk, setImgOk] = useState(false);

  const showLogo = !empty && !!logoSrc && imgOk;

  const onLoad = useCallback(() => setImgOk(true), []);
  const onError = useCallback(() => setImgOk(false), []);

  const safeName = useMemo(() => {
    const t = airlineName.trim() || (empty ? '—' : '');
    return t.length > 42 ? `${t.slice(0, 40)}…` : t;
  }, [airlineName, empty]);

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
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect x="0" y="0" width="100" height="140" fill={empty ? '#f1f5f9' : accentColor} opacity={empty ? 1 : 0.92} />
            {logoSrc && !empty ? (
              <image
                href={logoSrc}
                x="12"
                y="28"
                width="76"
                height="76"
                preserveAspectRatio="xMidYMid meet"
                onLoad={onLoad}
                onError={onError}
                style={{ opacity: showLogo ? 1 : 0 }}
              />
            ) : null}
            {empty ? (
              <text x="50" y="78" textAnchor="middle" fill="#94a3b8" fontSize="22" fontFamily="system-ui, sans-serif">
                ?
              </text>
            ) : null}
          </g>
          <path d={TAIL_PATH} fill="none" stroke="#0f172a" strokeOpacity={0.12} strokeWidth="1" />
        </svg>
      </div>
      <div
        className="px-1.5 py-2 text-center text-[11px] print:text-sm font-medium italic leading-tight min-h-[38px] print:min-h-[44px]"
        style={{ color: '#1e293b', borderTop: '1px solid #e2e8f0' }}
      >
        {safeName}
      </div>
    </div>
  );
}
