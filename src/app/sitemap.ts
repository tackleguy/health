import type { MetadataRoute } from "next";
import { getTrails } from "@/lib/data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const trails = await getTrails();

  return [
    {
      url: `${BASE_URL}/explore/trails`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...trails.map((trail) => ({
      url: `${BASE_URL}/explore/trails/${trail.id}`,
      lastModified: new Date(trail.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
