"use client";

interface AltimeterGaugeProps {
  altitudeFt: number | null;
  className?: string;
}

const R = 40;
const CX = 50;
const CY = 50;
const TRACK = 2 * Math.PI * R;

/**
 * Digital-led elevation instrument: large tabular altitude first,
 * compact 1,000 ft confirmation ring second. Theme tokens keep it
 * legible on Fieldbook light and the live recording shell.
 */
export function AltimeterGauge({ altitudeFt, className = "" }: AltimeterGaugeProps) {
  const hasFix = altitudeFt !== null && Number.isFinite(altitudeFt);
  const value = hasFix ? Math.max(0, altitudeFt) : 0;
  const withinThousand = value % 1000;
  const progress = withinThousand / 1000;
  const needleAngle = progress * 360;

  const rounded = Math.round(value);
  const readout = hasFix ? rounded.toLocaleString() : "—";
  const ariaLabel = hasFix
    ? `Elevation ${rounded.toLocaleString()} feet`
    : "Waiting for GPS elevation";

  return (
    <div
      className={`flex flex-col items-center text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
    >
      <div className="relative h-24 w-24" aria-hidden>
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="5"
          />
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${progress * TRACK} ${TRACK}`}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{
              transition: "stroke-dasharray 280ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * 360 - 90;
            const rad = (a * Math.PI) / 180;
            const major = i % 5 === 0;
            const inner = major ? 28 : 32;
            const outer = 36;
            return (
              <line
                key={i}
                x1={CX + inner * Math.cos(rad)}
                y1={CY + inner * Math.sin(rad)}
                x2={CX + outer * Math.cos(rad)}
                y2={CY + outer * Math.sin(rad)}
                stroke={major ? "var(--cream)" : "var(--mist)"}
                strokeWidth={major ? 1.6 : 1}
                strokeOpacity={major ? 0.9 : 0.5}
              />
            );
          })}
          <g transform={`rotate(${needleAngle} ${CX} ${CY})`}>
            <line
              x1={CX}
              y1={CY + 6}
              x2={CX}
              y2={CY - 30}
              stroke="var(--cream)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r="3.5" fill="var(--cream)" />
            <circle cx={CX} cy={CY} r="1.5" fill="var(--surface)" />
          </g>
        </svg>
      </div>

      <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-cream">
        {readout}
      </p>
      <p className="mt-0.5 text-sm text-mist">
        {hasFix ? "ft elevation" : "Waiting for GPS…"}
      </p>
    </div>
  );
}
