import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPark, getTrailsByPark } from "@/lib/data";
import { MapView } from "@/components/map/MapView";
import { formatLocation, difficultyColor } from "@/lib/utils";

export default async function ParkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const park = await getPark(id);

  if (!park) notFound();

  const trails = await getTrailsByPark(id);

  const markers = [
    {
      id: park.id,
      type: "park" as const,
      name: park.park_name,
      latitude: park.latitude,
      longitude: park.longitude,
      href: `/parks/${park.id}`,
    },
    ...trails.map((trail) => ({
      id: trail.id,
      type: "trail" as const,
      name: trail.trail_name,
      latitude: trail.latitude,
      longitude: trail.longitude,
      href: `/trails/${trail.id}`,
    })),
  ];

  return (
    <div>
      <div className="relative h-64 overflow-hidden bg-stone-200 sm:h-80">
        {park.image_url && (
          <Image
            src={park.image_url}
            alt={park.park_name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-medium text-emerald-300">
              {formatLocation(park.state, park.country)}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {park.park_name}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="leading-relaxed text-stone-700">{park.description}</p>

            <section className="mt-10">
              <h2 className="mb-6 text-xl font-semibold text-stone-900">
                Trails in this park ({trails.length})
              </h2>
              <div className="space-y-3">
                {trails.map((trail) => (
                  <Link
                    key={trail.id}
                    href={`/trails/${trail.id}`}
                    className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-stone-900">
                        {trail.trail_name}
                      </p>
                      <p className="text-sm text-stone-500">
                        {trail.length_miles} mi · {trail.elevation_ft.toLocaleString()} ft gain
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyColor(trail.difficulty)}`}
                    >
                      {trail.difficulty}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-stone-900">Park info</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Acreage</dt>
                  <dd className="font-medium">{park.acreage.toLocaleString()}</dd>
                </div>
                {park.contact && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Contact</dt>
                    <dd className="font-medium">{park.contact}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-stone-500">Location</dt>
                  <dd className="font-medium">
                    {formatLocation(park.state, park.country)}
                  </dd>
                </div>
              </dl>
            </div>

            <MapView
              mode="trail"
              markers={markers}
              center={[park.longitude, park.latitude]}
              zoom={10}
              className="h-64"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
