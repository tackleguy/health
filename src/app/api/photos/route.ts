import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminAuthorized } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";

/** Admin-only: register a licensed trail photo with full attribution metadata */
export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return adminUnauthorizedResponse();
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      trail_id: string;
      url: string;
      license: string;
      attribution: string;
      source_name: string;
      thumbnail_url?: string;
      caption?: string;
      photographer?: string;
      license_url?: string;
      source_url?: string;
      is_hero?: boolean;
    };

    if (!body.trail_id || !body.url || !body.license || !body.attribution || !body.source_name) {
      return NextResponse.json(
        { error: "trail_id, url, license, attribution, and source_name are required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("trail_photos")
      .insert({
        trail_id: body.trail_id,
        url: body.url,
        thumbnail_url: body.thumbnail_url ?? null,
        caption: body.caption ?? null,
        photographer: body.photographer ?? null,
        license: body.license,
        license_url: body.license_url ?? null,
        attribution: body.attribution,
        source_name: body.source_name,
        source_url: body.source_url ?? null,
        is_hero: body.is_hero ?? false,
        confidence_score: "source_reported",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Photo insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
