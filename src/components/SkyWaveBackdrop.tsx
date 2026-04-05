/**
 * SILKSPOT backdrop — flat vertical twilight gradient only (no radial “bubbles”, stars, or waves).
 */
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
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  );
}
