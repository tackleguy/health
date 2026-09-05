import type { TrailPhotoRecord } from "../types";
import { BaseAdapter } from "./base";

interface WikimediaGeoResult {
  query?: {
    geosearch?: Array<{
      pageid: number;
      title: string;
      dist: number;
    }>;
  };
}

interface WikimediaImageInfo {
  query?: {
    pages?: Record<
      string,
      {
        pageid: number;
        title: string;
        imageinfo?: Array<{
          url: string;
          thumburl?: string;
          extmetadata?: Record<string, { value?: string }>;
        }>;
      }
    >;
  };
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/** Wikimedia Commons geo-search for trail photos (CC-licensed, attribution required) */
export class WikimediaCommonsAdapter extends BaseAdapter {
  readonly name = "wikimedia";

  async download(config: Parameters<BaseAdapter["download"]>[0]): Promise<unknown> {
    const lat = config.options?.latitude;
    const lng = config.options?.longitude;
    const radius = (config.options?.radiusMeters as number | undefined) ?? 500;
    const limit = (config.options?.limit as number | undefined) ?? 10;

    if (typeof lat !== "number" || typeof lng !== "number") {
      throw new Error("Wikimedia adapter requires options.latitude and options.longitude");
    }

    const geoParams = new URLSearchParams({
      action: "query",
      list: "geosearch",
      gscoord: `${lat}|${lng}`,
      gsradius: String(Math.min(radius, 10000)),
      gslimit: String(limit),
      format: "json",
      origin: "*",
    });

    const geoRes = await fetch(`${COMMONS_API}?${geoParams.toString()}`);
    if (!geoRes.ok) throw new Error(`Wikimedia geosearch failed: ${geoRes.status}`);
    const geoData = (await geoRes.json()) as WikimediaGeoResult;
    const pages = geoData.query?.geosearch ?? [];
    if (pages.length === 0) return { photos: [] as TrailPhotoRecord[] };

    const titles = pages.map((p) => p.title).join("|");
    const imageParams = new URLSearchParams({
      action: "query",
      titles,
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "640",
      format: "json",
      origin: "*",
    });

    const imageRes = await fetch(`${COMMONS_API}?${imageParams.toString()}`);
    if (!imageRes.ok) throw new Error(`Wikimedia imageinfo failed: ${imageRes.status}`);
    const imageData = (await imageRes.json()) as WikimediaImageInfo;

    const photos: TrailPhotoRecord[] = [];
    for (const page of Object.values(imageData.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;

      const meta = info.extmetadata ?? {};
      const license = stripHtml(meta.LicenseShortName?.value) ?? "See Wikimedia Commons";
      const artist = stripHtml(meta.Artist?.value);
      const attribution = artist
        ? `${artist} / Wikimedia Commons`
        : `${page.title} / Wikimedia Commons`;

      photos.push({
        url: info.url,
        thumbnailUrl: info.thumburl,
        caption: page.title.replace(/^File:/, "").replace(/_/g, " "),
        photographer: artist,
        license,
        licenseUrl: stripHtml(meta.LicenseUrl?.value),
        attribution,
        sourceName: "Wikimedia Commons",
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        externalId: String(page.pageid),
        latitude: lat,
        longitude: lng,
      });
    }

    return { photos };
  }

  async parse(raw: unknown): Promise<never[]> {
    void raw;
    return [];
  }

  async fetchPhotos(
    lat: number,
    lng: number,
    maxDistanceMeters = 500,
  ): Promise<TrailPhotoRecord[]> {
    const result = (await this.download({
      adapter: "wikimedia",
      sourceName: "Wikimedia Commons",
      license: "Various CC",
      attribution: "Wikimedia Commons",
      enabled: true,
      options: { latitude: lat, longitude: lng, radiusMeters: maxDistanceMeters },
    })) as { photos: TrailPhotoRecord[] };
    return result.photos ?? [];
  }
}

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/<[^>]+>/g, "").trim() || undefined;
}

export function matchPhotosToTrail(
  photos: TrailPhotoRecord[],
  trailLat: number,
  trailLng: number,
  maxDistanceMeters: number,
): TrailPhotoRecord[] {
  return photos.filter((photo) => {
    if (photo.latitude == null || photo.longitude == null) return false;
    const d = haversineMeters(trailLat, trailLng, photo.latitude, photo.longitude);
    return d <= maxDistanceMeters;
  });
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
