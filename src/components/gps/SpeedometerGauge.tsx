"use client";

interface SpeedometerGaugeProps {
  speedMph: number;
  className?: string;
}

export function SpeedometerGauge({ speedMph, className = "" }: SpeedometerGaugeProps) {
  const maxSpeed = 30;
  const clamped = Math.min(Math.max(speedMph, 0), maxSpeed);
  const angle = (clamped / maxSpeed) * 180 - 90;
  const arcLen = 126;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 100 60" className="h-full w-full">
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#292524"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#44403c"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {[0, 5, 10, 15, 20, 25, 30].map((tick) => {
            const a = (tick / maxSpeed) * 180 - 180;
            const rad = (a * Math.PI) / 180;
            const x1 = 50 + 34 * Math.cos(rad);
            const y1 = 55 + 34 * Math.sin(rad);
            const x2 = 50 + 38 * Math.cos(rad);
            const y2 = 55 + 38 * Math.sin(rad);
            return (
              <g key={tick}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78716c" strokeWidth="1.5" />
                {tick % 10 === 0 && (
                  <text
                    x={50 + 28 * Math.cos(rad)}
                    y={55 + 28 * Math.sin(rad)}
                    fill="#a8a29e"
                    fontSize="5"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {tick}
                  </text>
                )}
              </g>
            );
          })}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / maxSpeed) * arcLen} ${arcLen}`}
          />
          <line
            x1="50"
            y1="55"
            x2="50"
            y2="18"
            stroke="#fafaf9"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${angle} 50 55)`}
          />
          <circle cx="50" cy="55" r="4" fill="#fafaf9" />
        </svg>
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Speedometer
      </p>
      <p className="text-xl font-bold tabular-nums text-stone-900">
        {speedMph.toFixed(1)} mph
      </p>
      <p className="text-[10px] text-stone-400">Smoothed · AgOpenGPS avg</p>
    </div>
  );
}
