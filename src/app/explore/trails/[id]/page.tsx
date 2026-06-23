import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviews, getTrail } from "@/lib/data";
import { ReviewsSection } from "@/components/trails/ReviewsSection";
import { MapView } from "@/components/map/MapView";
import { difficultyColor, formatRating } from "@/lib/utils";

export default async function ExploreTrailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trail = await getTrail(id);

  if (!trail) notFound();

  const reviews = await getReviews(id);

  const markers = [
    {
      id: trail.id,
      type: "trail" as const,
      name: trail.trail_name,
      latitude: trail.latitude,
      longitude: trail.longitude,
      href: `/explore/trails/${trail.id}`,
    },
    ...(trail.park
      ? [
          {
            id: trail.park.id,
            type: "park" as const,
            name: trail.park.park_name,
            latitude: trail.park.latitude,
            longitude: trail.park.longitude,
            href: `/parks/${trail.park.id}`,
          },
        ]
      : []),
  ];

  const startHikeHref = `/record/live?type=hike&trail_id=${trail.id}`;

  return (
    <div className="pb-24 md:pb-8">
      <div className="relative h-64 overflow-hidden bg-stone-200 sm:h-80">
        {trail.image_url && (
          <Image
            src={trail.image_url}
            alt={trail.trail_name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="mx-auto max-w-7xl">
            {trail.park && (
              <Link
                href={`/parks/${trail.park.id}`}
                className="text-sm font-medium text-emerald-300 hover:underline"
              >
                {trail.park.park_name}
              </Link>
            )}
            <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {trail.trail_name}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link
          href={startHikeHref}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 sm:w-auto sm:px-10"
        >
          🥾 Start Hike — GPS tracking
        </Link>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6 flex flex-wrap gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${difficultyColor(trail.difficulty)}`}
              >
                {trail.difficulty}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
                {trail.route_type}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                ★ {formatRating(trail.avg_rating)} ({trail.review_count} reviews)
              </span>
            </div>

            <p className="leading-relaxed text-stone-700">{trail.description}</p>

            <ReviewsSection trailId={trail.id} initialReviews={reviews} />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-semibold text-stone-900">Trail stats</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Length</dt>
                  <dd className="font-medium">{trail.length_miles} mi</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Elevation gain</dt>
                  <dd className="font-medium">
                    {trail.elevation_ft.toLocaleString()} ft
                  </dd>
                </div>
                {trail.duration && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Duration</dt>
                    <dd className="font-medium">{trail.duration}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-stone-500">Route type</dt>
                  <dd className="font-medium">{trail.route_type}</dd>
                </div>
              </dl>
            </div>

            <MapView
              mode="trail"
              markers={markers}
              center={[trail.longitude, trail.latitude]}
              zoom={11}
              className="h-64"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
