import { NextResponse } from "next/server";
import { parseRouteFile } from "@/lib/ingestion/parsers/gpx";
import { persistImportedRoute } from "@/lib/gpx/persist";
import { metersToMiles } from "@/lib/gps";
import { getAuthUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActivityType } from "@/lib/types";

function parsePersistFlag(value: FormDataEntryValue | string | null): boolean {
  if (value == null) return false;
  const v = String(value).toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const url = new URL(request.url);
    let content: string;
    let format: "gpx" | "kml" | "geojson" = "gpx";
    let persist = parsePersistFlag(url.searchParams.get("persist"));
    let title: string | undefined;
    let trailId: string | undefined;
    let activityType: ActivityType = "hike";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const formatField = form.get("format");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file field required" }, { status: 400 });
      }
      content = await file.text();
      if (formatField === "kml" || formatField === "geojson") {
        format = formatField;
      } else if (file.name.endsWith(".kml")) {
        format = "kml";
      } else if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        format = "geojson";
      }
      persist = persist || parsePersistFlag(form.get("persist"));
      const titleField = form.get("title");
      if (typeof titleField === "string" && titleField.trim()) title = titleField.trim();
      const trailField = form.get("trail_id");
      if (typeof trailField === "string" && trailField.trim()) trailId = trailField.trim();
      const typeField = form.get("activity_type");
      if (typeField === "run" || typeField === "hike" || typeField === "bike" || typeField === "ski") {
        activityType = typeField;
      }
    } else {
      content = await request.text();
      const qFormat = url.searchParams.get("format");
      if (qFormat === "kml" || qFormat === "geojson") format = qFormat;
      else if (content.trim().startsWith("{")) format = "geojson";
      else if (content.includes("<kml")) format = "kml";

      const titleParam = url.searchParams.get("title");
      if (titleParam) title = titleParam;
      const trailParam = url.searchParams.get("trail_id");
      if (trailParam) trailId = trailParam;
      const typeParam = url.searchParams.get("activity_type");
      if (typeParam === "run" || typeParam === "hike" || typeParam === "bike" || typeParam === "ski") {
        activityType = typeParam;
      }

      if (contentType.includes("application/json")) {
        try {
          const body = JSON.parse(content) as {
            content?: string;
            format?: string;
            persist?: boolean;
            title?: string;
            trail_id?: string;
            activity_type?: ActivityType;
          };
          if (body.content) content = body.content;
          if (body.format === "kml" || body.format === "geojson") format = body.format;
          if (body.persist) persist = true;
          if (body.title) title = body.title;
          if (body.trail_id) trailId = body.trail_id;
          if (
            body.activity_type === "run" ||
            body.activity_type === "hike" ||
            body.activity_type === "bike" ||
            body.activity_type === "ski"
          ) {
            activityType = body.activity_type;
          }
        } catch {
          // treat body as raw route file content
        }
      }
    }

    const parsed = parseRouteFile(content, format);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse route file" }, { status: 422 });
    }

    const routes = Array.isArray(parsed) ? parsed : [parsed];
    const primary = routes[0];

    const responseBody: Record<string, unknown> = {
      routes: routes.map((route) => ({
        name: route.name,
        geometry: route.geojson,
        stats: {
          distance_m: route.distanceM,
          distance_miles: metersToMiles(route.distanceM),
          elevation_gain_ft: route.elevationGainFt,
          elevation_loss_ft: route.elevationLossFt,
          highest_point_ft:
            route.highestPointM != null
              ? Math.round(route.highestPointM * 3.28084)
              : null,
          lowest_point_ft:
            route.lowestPointM != null
              ? Math.round(route.lowestPointM * 3.28084)
              : null,
        },
      })),
      primary: {
        geometry: primary.geojson,
        stats: {
          distance_m: primary.distanceM,
          distance_miles: metersToMiles(primary.distanceM),
          elevation_gain_ft: primary.elevationGainFt,
          elevation_loss_ft: primary.elevationLossFt,
        },
      },
    };

    if (persist) {
      const { supabase, user } = await getAuthUser();
      const writeClient = user ? supabase : createServiceClient();

      if (!writeClient) {
        return NextResponse.json(
          { error: "Storage unavailable — configure Supabase service role" },
          { status: 503 },
        );
      }

      const saved = await persistImportedRoute(writeClient, user?.id ?? null, {
        route: primary,
        sourceFormat: format,
        title,
        trailId,
        activityType,
      });

      responseBody.saved = saved;
    }

    return NextResponse.json(responseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : "GPX import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
