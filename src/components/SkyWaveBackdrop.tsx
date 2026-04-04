/**
 * SILKSPOT signature atmosphere: ink-plum zenith, petrol depth, ember horizon,
 * pearlescent mist — not generic aviation blue. Subtle aurora + starfield + waves.
 */
const STAR_SEED = [
  [8, 6, 0.55], [14, 11, 0.35], [22, 4, 0.45], [31, 9, 0.3], [38, 5, 0.5], [46, 12, 0.25],
  [52, 7, 0.4], [61, 3, 0.5], [69, 10, 0.3], [77, 6, 0.45], [86, 11, 0.35], [93, 5, 0.4],
  [11, 14, 0.28], [19, 18, 0.4], [27, 15, 0.32], [35, 20, 0.38], [44, 16, 0.26], [58, 19, 0.33],
  [66, 14, 0.42], [74, 21, 0.3], [82, 17, 0.36], [91, 20, 0.28], [17, 22, 0.24], [55, 23, 0.3],
];

export function SkyWaveBackdrop() {
  return (
    <div className="sky-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Core diagonal: void → plum → petrol → ember band → warm mist */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(158deg,
            #040208 0%,
            #0a0614 10%,
            #12081f 22%,
            #1a0c2c 34%,
            #241038 42%,
            #2d1545 48%,
            #1e3d42 58%,
            #2a5a52 64%,
            #5c3d4d 72%,
            #8b5a62 78%,
            #c4a29a 86%,
            #ddd2e0 92%,
            #ebe4f0 96%,
            #f2eef8 100%
          )`,
        }}
      />

      {/* Aurora / contrail energy — teal + magenta + ember (very soft) */}
      <div
        className="absolute inset-0 opacity-[0.65] mix-blend-screen"
        style={{
          background: `
            radial-gradient(ellipse 100% 55% at 15% 0%, rgba(45, 212, 191, 0.18) 0%, transparent 52%),
            radial-gradient(ellipse 80% 45% at 92% 8%, rgba(192, 38, 211, 0.12) 0%, transparent 48%),
            radial-gradient(ellipse 70% 40% at 55% 18%, rgba(251, 146, 60, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 40% 35%, rgba(52, 211, 153, 0.08) 0%, transparent 45%)
          `,
        }}
      />

      {/* Low sun rim (warm lift at horizon) */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 140% 55% at 50% 115%, rgba(251, 191, 36, 0.22) 0%, transparent 55%)',
        }}
      />

      {/* Sparse starfield — upper third only */}
      <svg
        className="absolute left-0 top-0 h-[42%] w-full opacity-[0.35]"
        viewBox="0 0 100 42"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden
      >
        {STAR_SEED.map(([x, y, o], i) => (
          <circle key={i} cx={x} cy={y} r={0.35 + (i % 3) * 0.15} fill="rgba(255,250,245,0.9)" opacity={o} />
        ))}
      </svg>

      {/* Organic waves — plum, petrol silk, pearlescent (no steel blue) */}
      <div className="sky-wave-wrap absolute -left-[10%] bottom-0 h-[min(60vh,640px)] w-[118%] opacity-[0.42]">
        <svg className="sky-wave-drift-slow h-full w-full" viewBox="0 0 1440 420" preserveAspectRatio="none">
          <path
            fill="rgba(45, 21, 62, 0.55)"
            d="M0,285 C200,210 380,255 540,228 C700,200 820,165 980,188 C1140,210 1280,155 1440,195 L1440,420 L0,420 Z"
          />
        </svg>
      </div>

      <div className="sky-wave-wrap absolute -left-[6%] bottom-0 h-[min(50vh,540px)] w-[114%] opacity-[0.38]">
        <svg className="sky-wave-drift-mid h-full w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path
            fill="rgba(30, 80, 78, 0.4)"
            d="M0,318 C220,255 420,295 640,265 C860,235 1040,198 1240,232 C1340,248 1400,215 1440,228 L1440,400 L0,400 Z"
          />
        </svg>
      </div>

      <div className="sky-wave-wrap absolute -left-[4%] bottom-0 h-[min(40vh,440px)] w-[110%] opacity-[0.45]">
        <svg className="sky-wave-drift-fast h-full w-full" viewBox="0 0 1440 360" preserveAspectRatio="none">
          <path
            fill="rgba(236, 228, 245, 0.55)"
            d="M0,338 C260,275 500,308 740,282 C980,256 1180,228 1440,258 L1440,360 L0,360 Z"
          />
        </svg>
      </div>

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  );
}
