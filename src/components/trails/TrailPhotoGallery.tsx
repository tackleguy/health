"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrailPhoto } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif";

interface TrailPhotoGalleryProps {
  trailId: string;
  photos: TrailPhoto[];
}

export function TrailPhotoGallery({ trailId, photos: initialPhotos }: TrailPhotoGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then((result) => {
      setUserId(result.data.user?.id ?? null);
    });
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    if (!supabase || !userId) {
      setError("Log in to add photos.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploaded: TrailPhoto[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Only image files are supported.");
        }
        if (file.size > MAX_BYTES) {
          throw new Error("Each photo must be under 10 MB.");
        }

        const ext =
          file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
          "jpg";
        const path = `${userId}/${trailId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("trail-photos")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("trail-photos").getPublicUrl(path);

        const { data, error: insertError } = await supabase
          .from("trail_photos")
          .insert({
            trail_id: trailId,
            url: publicUrl,
            thumbnail_url: publicUrl,
            caption: caption.trim() || null,
            photographer: null,
            license: "user",
            license_url: null,
            attribution: "Community photo",
            source_name: "user",
            source_url: null,
            uploaded_by: userId,
            is_hero: photos.length + uploaded.length === 0,
            confidence_score: "source_reported",
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        uploaded.push(data as TrailPhoto);
      }

      setPhotos((prev) => [...prev, ...uploaded]);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photo: TrailPhoto) {
    if (!userId || photo.uploaded_by !== userId) return;
    const supabase = createClient();
    if (!supabase) return;

    setError(null);
    const confirmed = window.confirm("Remove this photo?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("trail_photos")
      .delete()
      .eq("id", photo.id)
      .eq("uploaded_by", userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));

    try {
      const marker = "/storage/v1/object/public/trail-photos/";
      const idx = photo.url.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(photo.url.slice(idx + marker.length));
        await supabase.storage.from("trail-photos").remove([path]);
      }
    } catch {
      // Row delete already succeeded; storage cleanup is best-effort.
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-stone-900">
          Photos {photos.length > 0 ? `(${photos.length})` : ""}
        </h2>
        {userId ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Add photo"}
          </button>
        ) : (
          <Link href="/login" className="text-sm font-medium text-emerald-700 hover:underline">
            Log in to add photos
          </Link>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {userId && (
        <div className="mb-4">
          <label className="sr-only" htmlFor={`photo-caption-${trailId}`}>
            Caption (optional)
          </label>
          <input
            id={`photo-caption-${trailId}`}
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional caption for your next upload"
            maxLength={200}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
          <p className="text-sm font-medium text-stone-700">No photos yet</p>
          <p className="mt-2 text-sm text-stone-500">
            Be the first to share a photo from this trail.
          </p>
        </div>
      ) : (
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
                  unoptimized
                />
              </div>
              <figcaption className="space-y-2 p-3">
                {photo.caption && (
                  <p className="text-sm text-stone-700">{photo.caption}</p>
                )}
                <p className="text-xs text-stone-500">Community photo</p>
                {userId && photo.uploaded_by === userId && (
                  <button
                    type="button"
                    onClick={() => void removePhoto(photo)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
