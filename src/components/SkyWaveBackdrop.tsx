/**
 * Full-viewport layered sky: deep navy → steel blue → pale mist (Planespotters-style),
 * plus soft SVG waves and a slow drift for depth.
 */
export function SkyWaveBackdrop() {
  return (
    <div className="sky-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(165deg,
            #070b14 0%,
            #0c1222 8%,
            #111b2e 18%,
            #162a45 32%,
            #1e3d5c 44%,
            #2d4f6e 52%,
            #4a6b88 62%,
            #7a93ad 74%,
            #b3c5d6 86%,
            #dce6ef 93%,
            #eef2f7 97%,
            #f4f6fa 100%
          )`,
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          background: `radial-gradient(ellipse 120% 70% at 50% -15%, rgba(56, 189, 248, 0.22) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 85% 25%, rgba(14, 165, 233, 0.12) 0%, transparent 45%),
            radial-gradient(ellipse 60% 40% at 10% 40%, rgba(99, 102, 241, 0.08) 0%, transparent 40%)`,
        }}
      />

      <div className="sky-wave-wrap absolute -left-[8%] bottom-0 h-[min(58vh,620px)] w-[116%] opacity-[0.38]">
        <svg className="sky-wave-drift-slow h-full w-full" viewBox="0 0 1440 420" preserveAspectRatio="none">
          <path
            fill="rgba(15, 40, 70, 0.45)"
            d="M0,280 C180,220 320,260 480,240 C640,220 760,180 920,200 C1080,220 1260,160 1440,200 L1440,420 L0,420 Z"
          />
        </svg>
      </div>

      <div className="sky-wave-wrap absolute -left-[5%] bottom-0 h-[min(48vh,520px)] w-[112%] opacity-[0.32]">
        <svg className="sky-wave-drift-mid h-full w-full" viewBox="0 0 1440 400" preserveAspectRatio="none">
          <path
            fill="rgba(100, 140, 180, 0.35)"
            d="M0,320 C200,260 400,300 600,270 C800,240 1000,200 1200,230 C1320,245 1380,210 1440,225 L1440,400 L0,400 Z"
          />
        </svg>
      </div>

      <div className="sky-wave-wrap absolute -left-[3%] bottom-0 h-[min(38vh,400px)] w-[108%] opacity-[0.28]">
        <svg className="sky-wave-drift-fast h-full w-full" viewBox="0 0 1440 360" preserveAspectRatio="none">
          <path
            fill="rgba(220, 230, 242, 0.5)"
            d="M0,340 C240,280 480,310 720,285 C960,260 1200,220 1440,250 L1440,360 L0,360 Z"
          />
        </svg>
      </div>

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />
    </div>
  );
}
