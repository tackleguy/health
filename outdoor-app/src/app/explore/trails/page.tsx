import { getTrails } from "@/lib/data";
import { TrailCard } from "@/components/trails/TrailCard";

export default async function ExploreTrailsPage() {
  let trails: Awaited<ReturnType<typeof getTrails>> = [];

  try {
    trails = await getTrails();
  } catch {
    // handled below
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6 md:pb-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-700">Explore · Trails</p>
        <h1 className="text-3xl font-bold text-stone-900">Find your next hike</h1>
        <p className="mt-2 text-stone-500">
          {trails.length} trails across {new Set(trails.map((t) => t.park_id)).size} parks
        </p>
      </div>

      {trails.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-stone-200 px-6 py-12 text-center text-stone-500">
          No trails found. Set up Supabase and run migrations + seed.
        </p>
      )}
    </div>
  );
}
