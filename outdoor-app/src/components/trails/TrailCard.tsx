import Link from "next/link";
import Image from "next/image";
import type { Trail } from "@/lib/types";
import { difficultyColor, formatRating } from "@/lib/utils";

export function TrailCard({ trail }: { trail: Trail }) {
  return (
    <Link
      href={`/explore/trails/${trail.id}`}
      className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
        {trail.image_url && (
          <Image
            src={trail.image_url}
            alt={trail.trail_name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${difficultyColor(trail.difficulty)}`}
        >
          {trail.difficulty}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700">
          {trail.trail_name}
        </h3>
        {trail.park && (
          <p className="mt-1 text-sm text-stone-500">
            {trail.park.park_name}, {trail.park.state}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
          <span>{trail.length_miles} mi</span>
          <span>{trail.elevation_ft.toLocaleString()} ft gain</span>
          <span className="font-medium text-amber-600">
            ★ {formatRating(trail.avg_rating)}
          </span>
        </div>
      </div>
    </Link>
  );
}
