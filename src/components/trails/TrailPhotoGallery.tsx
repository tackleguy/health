import type { TrailPhoto } from "@/lib/types";
import Image from "next/image";

interface PhotoAttributionProps {
  photo: Pick<
    TrailPhoto,
    "attribution" | "license" | "license_url" | "source_name" | "source_url" | "photographer"
  >;
  className?: string;
}

export function PhotoAttribution({ photo, className = "" }: PhotoAttributionProps) {
  return (
    <p className={`text-xs text-stone-500 ${className}`}>
      {photo.photographer && <span>{photo.photographer} · </span>}
      <span>{photo.attribution}</span>
      {" · "}
      {photo.license_url ? (
        <a
          href={photo.license_url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-stone-700"
        >
          {photo.license}
        </a>
      ) : (
        <span>{photo.license}</span>
      )}
      {photo.source_url ? (
        <>
          {" · "}
          <a
            href={photo.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-stone-700"
          >
            {photo.source_name}
          </a>
        </>
      ) : (
        photo.source_name && <span> · {photo.source_name}</span>
      )}
    </p>
  );
}

interface TrailPhotoGalleryProps {
  photos: TrailPhoto[];
}

export function TrailPhotoGallery({ photos }: TrailPhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
        <p className="text-sm font-medium text-stone-700">Photo gallery</p>
        <p className="mt-2 text-sm text-stone-500">
          No licensed photos matched to this trail yet. Photos will appear here with full
          attribution once ingested from approved sources.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-stone-900">Photos</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <figure
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
          >
            <div className="relative aspect-[4/3] bg-stone-100">
              <Image
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.caption ?? "Trail photo"}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <figcaption className="space-y-1 p-3">
              {photo.caption && (
                <p className="text-sm text-stone-700">{photo.caption}</p>
              )}
              <PhotoAttribution photo={photo} />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
