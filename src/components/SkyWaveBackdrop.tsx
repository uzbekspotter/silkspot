/**
 * SILKSPOT backdrop — #3f4b63 → #667c9d → mist.
 * Parent must be `position: relative` (or similar) and clip overflow as needed.
 */
export function SkyWaveBackdropLayers({ className = '' }: { className?: string }) {
  const cn = className.trim();
  return (
    <>
      <div
        className={`absolute inset-0 ${cn}`.trim()}
        aria-hidden
        style={{
          background: `linear-gradient(180deg,
            #3f4b63 0%,
            #667c9d 52%,
            #dbe7f0 100%
          )`,
        }}
      />
      <div
        className={`absolute inset-0 opacity-[0.022] ${cn}`.trim()}
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </>
  );
}

export function SkyWaveBackdrop() {
  return (
    <div className="sky-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <SkyWaveBackdropLayers />
    </div>
  );
}
