interface Props {
  value: string;
  label: string;
  sub: string;
  colorClass?: string;
}

export function StatCard({
  value,
  label,
  sub,
  colorClass = "text-cream",
}: Props) {
  return (
    <div className="surface-card p-5 text-center transition hover:border-[var(--border-strong)]">
      <div
        className={`mb-1 font-mono text-[2rem] font-medium leading-none ${colorClass}`}
      >
        {value}
      </div>
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sage">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-[0.65rem] text-mist">{sub}</div>
    </div>
  );
}
