/**
 * SILKSPOT atmosphere — high-altitude twilight: deep stratosphere blue above,
 * soft horizon haze below. Restrained cyan (brand) glow, minimal waves — no purple/magenta soup.
 */
const STAR_SEED = [
  [10, 5, 0.4], [18, 8, 0.28], [28, 4, 0.38], [40, 10, 0.22], [52, 6, 0.35],
  [65, 3, 0.42], [78, 9, 0.26], [88, 5, 0.33], [95, 11, 0.24], [22, 12, 0.2],
  [48, 14, 0.3], [72, 13, 0.25], [58, 7, 0.36],
];

export function SkyWaveBackdrop() {
  return (
    <div className="sky-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Vertical stack: night zenith → steel air → pale haze (readable behind white UI) */}
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

      {/* Soft brand-sky glow — upper left only */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background: `
            radial-gradient(ellipse 85% 55% at 8% 0%, rgba(14, 165, 233, 0.14) 0%, transparent 52%),
            radial-gradient(ellipse 70% 45% at 92% 12%, rgba(56, 189, 248, 0.07) 0%, transparent 48%)
          `,
        }}
      />

      {/* Horizon lift — cool mist, not amber */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse 130% 50% at 50% 108%, rgba(232, 241, 245, 0.45) 0%, transparent 58%)',
        }}
      />

      {/* Sparse stars — cool white, upper zone */}
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

      {/* Two soft waves — blue-slate + mist (was plum/petrol/pearl trio) */}
      <div className="sky-wave-wrap absolute -left-[8%] bottom-0 h-[min(52vh,560px)] w-[116%] opacity-[0.38]">
        <svg className="sky-wave-drift-slow h-full w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path
            fill="rgba(12, 35, 52, 0.5)"
            d="M0,268 C210,198 400,242 580,212 C760,182 900,148 1080,178 C1220,198 1360,158 1440,188 L1440,400 L0,400 Z"
          />
        </svg>
      </div>

      <div className="sky-wave-wrap absolute -left-[4%] bottom-0 h-[min(38vh,420px)] w-[112%] opacity-[0.4]">
        <svg className="sky-wave-drift-mid h-full w-full" viewBox="0 0 1440 340" preserveAspectRatio="none">
          <path
            fill="rgba(216, 232, 238, 0.5)"
            d="M0,298 C240,238 480,272 720,248 C960,224 1180,202 1440,232 L1440,340 L0,340 Z"
          />
        </svg>
      </div>

      {/* Very light grain */}
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
