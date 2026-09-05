import type { Campsite, Trailhead, WaterSource } from "@/lib/types";
import type { ReactNode } from "react";

interface TrailPoisSectionProps {
  campsites: Campsite[];
  waterSources: WaterSource[];
  trailheads: Trailhead[];
}

function confidenceLabel(level: string): string {
  return level.replace(/_/g, " ");
}

export function TrailPoisSection({
  campsites,
  waterSources,
  trailheads,
}: TrailPoisSectionProps) {
  const hasAny =
    campsites.length > 0 || waterSources.length > 0 || trailheads.length > 0;

  if (!hasAny) {
    return (
      <section className="mb-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
        <p className="text-sm font-medium text-stone-700">Backpacking points of interest</p>
        <p className="mt-2 text-sm text-stone-500">
          No campsites, water sources, or trailheads are linked to this trail yet. POIs are
          added only from verified open-data sources — never inferred.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-10 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Backpacking info</h2>
        <p className="mt-1 text-sm text-stone-500">
          Source-reported POIs only. Always verify permits, water availability, and closures
          with official agencies before your trip.
        </p>
      </div>

      {trailheads.length > 0 && (
        <PoiGroup title="Trailheads" count={trailheads.length}>
          {trailheads.map((head) => (
            <PoiCard key={head.id} title={head.name ?? "Trailhead"} confidence={head.confidence_score}>
              {head.parking_info && <p>{head.parking_info}</p>}
              {head.fees && <p className="text-stone-600">Fees: {head.fees}</p>}
              {head.access_notes && <p className="text-stone-600">{head.access_notes}</p>}
              {head.restrooms != null && (
                <p className="text-stone-600">
                  Restrooms: {head.restrooms ? "Yes" : "No"}
                </p>
              )}
            </PoiCard>
          ))}
        </PoiGroup>
      )}

      {campsites.length > 0 && (
        <PoiGroup title="Campsites" count={campsites.length}>
          {campsites.map((site) => (
            <PoiCard key={site.id} title={site.name ?? "Campsite"} confidence={site.confidence_score}>
              {site.campsite_type && (
                <p className="capitalize">{site.campsite_type.replace(/_/g, " ")}</p>
              )}
              {site.capacity != null && <p>Capacity: ~{site.capacity}</p>}
              {site.seasonal_information && (
                <p className="text-amber-800">{site.seasonal_information}</p>
              )}
            </PoiCard>
          ))}
        </PoiGroup>
      )}

      {waterSources.length > 0 && (
        <PoiGroup title="Water sources" count={waterSources.length}>
          {waterSources.map((source) => (
            <PoiCard
              key={source.id}
              title={source.name ?? "Water source"}
              confidence={source.confidence_score}
            >
              {source.water_type && (
                <p className="capitalize">{source.water_type.replace(/_/g, " ")}</p>
              )}
              {source.treatment_required != null && (
                <p>
                  Treatment required: {source.treatment_required ? "Yes" : "Unknown"}
                </p>
              )}
              {source.seasonal_information && (
                <p className="text-amber-800">{source.seasonal_information}</p>
              )}
            </PoiCard>
          ))}
        </PoiGroup>
      )}
    </section>
  );
}

function PoiGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title} ({count})
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function PoiCard({
  title,
  confidence,
  children,
}: {
  title: string;
  confidence: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-medium text-stone-900">{title}</h4>
        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-500">
          {confidenceLabel(confidence)}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </article>
  );
}
