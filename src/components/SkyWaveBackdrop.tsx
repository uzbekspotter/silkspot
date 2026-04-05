/**
 * SILKSPOT atmosphere — high-altitude twilight: deep stratosphere blue above,
 * soft horizon haze below. Silhouetted jets with soft contrails (replace wave “blobs”).
 */
const STAR_SEED = [
  [10, 5, 0.4], [18, 8, 0.28], [28, 4, 0.38], [40, 10, 0.22], [52, 6, 0.35],
  [65, 3, 0.42], [78, 9, 0.26], [88, 5, 0.33], [95, 11, 0.24], [22, 12, 0.2],
  [48, 14, 0.3], [72, 13, 0.25], [58, 7, 0.36],
];

/** Nose toward +X; contrail sits on −X side */
function JetSilhouette({ scale = 1 }: { scale?: number }) {
  const s = scale;
  return (
    <>
      <rect
        x={-42 * s}
        y={-2.8 * s}
        width={38 * s}
        height={5.6 * s}
        rx={2.8 * s}
        fill="url(#silks-contrail)"
        filter="url(#silks-trail-soft)"
        opacity={0.85}
      />
      <path
        fill="rgba(248, 250, 252, 0.92)"
        d={`M ${-5 * s} ${4 * s} L ${2 * s} ${3.4 * s} L ${15 * s} ${5 * s} L ${14 * s} ${6.4 * s} L ${7.5 * s} ${5.8 * s} L ${5.5 * s} ${9 * s} L ${3.2 * s} ${9 * s} L ${4 * s} ${5.5 * s} L ${-6.5 * s} ${4.6 * s} L ${-5.5 * s} ${2.8 * s} L ${-1 * s} ${3.2 * s} Z`}
      />
    </>
  );
}

export function SkyWaveBackdrop() {
  return (
    <div className="sky-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            #050a12 0%,
            #0a1522 12%,
            #0f1f32 26%,
            #153047 40%,
            #1c3d56 52%,
            #2a5368 64%,
            #4a7288 76%,
            #8faeb8 88%,
            #c8d8df 94%,
            #e8f1f5 100%
          )`,
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background: `
            radial-gradient(ellipse 85% 55% at 8% 0%, rgba(14, 165, 233, 0.14) 0%, transparent 52%),
            radial-gradient(ellipse 70% 45% at 92% 12%, rgba(56, 189, 248, 0.07) 0%, transparent 48%)
          `,
        }}
      />

      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse 130% 50% at 50% 108%, rgba(232, 241, 245, 0.45) 0%, transparent 58%)',
        }}
      />

      <svg
        className="absolute left-0 top-0 h-[38%] w-full opacity-[0.28]"
        viewBox="0 0 100 38"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden
      >
        {STAR_SEED.map(([x, y, o], i) => (
          <circle key={i} cx={x} cy={y} r={0.3 + (i % 3) * 0.12} fill="rgba(224, 242, 254, 0.95)" opacity={o} />
        ))}
      </svg>

      {/* Contrail jets — varied headings, mostly upper sky (readable over dark/mid tones) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.26]"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="silks-contrail" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.65)" />
            <stop offset="55%" stopColor="rgba(255, 255, 255, 0.2)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </linearGradient>
          <filter id="silks-trail-soft" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.15" />
          </filter>
        </defs>

        <g transform="translate(80, 11) rotate(-36)">
          <g className="sky-jet-drift-a origin-center">
            <JetSilhouette scale={0.11} />
          </g>
        </g>

        <g transform="translate(11, 20) rotate(31)">
          <g className="sky-jet-drift-b origin-center">
            <JetSilhouette scale={0.095} />
          </g>
        </g>

        <g transform="translate(66, 36) rotate(148)">
          <g className="sky-jet-drift-c origin-center">
            <JetSilhouette scale={0.09} />
          </g>
        </g>

        <g transform="translate(48, 9) rotate(6)">
          <g className="sky-jet-drift-d origin-center">
            <JetSilhouette scale={0.08} />
          </g>
        </g>

        <g transform="translate(90, 44) rotate(118)">
          <g className="sky-jet-drift-e origin-center">
            <JetSilhouette scale={0.075} />
          </g>
        </g>
      </svg>

      <div
        className="absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  );
}
