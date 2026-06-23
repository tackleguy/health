"use client";

import Image from "next/image";

interface AltimeterGaugeProps {
  altitudeFt: number | null;
  className?: string;
}

/** Three-hand altimeter — ported from AltimeterView.setAltitude() */
export function AltimeterGauge({ altitudeFt, className = "" }: AltimeterGaugeProps) {
  const value = Math.max(0, altitudeFt ?? 0);

  const hand100Deg = ((value % 1000) / 1000) * 360;
  const hand1kDeg = ((value % 10000) / 10000) * 360;
  const hand10kDeg = ((value % 100000) / 100000) * 360;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative h-32 w-32">
        <Image
          src="/gauges/altimeter01.png"
          alt=""
          fill
          className="rounded-full object-cover"
          sizes="128px"
        />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <Hand angle={hand10kDeg} length={28} color="#ef4444" width={2.5} />
          <Hand angle={hand1kDeg} length={32} color="#f59e0b" width={2} />
          <Hand angle={hand100Deg} length={36} color="#10b981" width={1.5} />
          <circle cx="50" cy="50" r="3" fill="#1c1917" />
        </svg>
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500">
        Altimeter
      </p>
      <p className="text-xl font-bold tabular-nums text-stone-900">
        {altitudeFt !== null ? `${altitudeFt.toLocaleString()} ft` : "—"}
      </p>
      <p className="text-[10px] text-stone-400">10k · 1k · 100 ft hands</p>
    </div>
  );
}

function Hand({
  angle,
  length,
  color,
  width,
}: {
  angle: number;
  length: number;
  color: string;
  width: number;
}) {
  return (
    <g transform={`rotate(${angle} 50 50)`}>
      <line
        x1="50"
        y1="50"
        x2="50"
        y2={50 - length}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    </g>
  );
}
