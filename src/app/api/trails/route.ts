import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseTrailFilters, queryTrailsFiltered } from "@/lib/trails";
import { getTrails } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseTrailFilters(searchParams);
    const hasFilters = Object.values(filters).some((v) => v != null && v !== "");

    const supabase = await createClient();
    if (supabase && hasFilters) {
      const trails = await queryTrailsFiltered(supabase, filters);
      return NextResponse.json({ trails, filters });
    }

    const trails = await getTrails();
    return NextResponse.json({ trails });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch trails";
    return NextResponse.json({ error: message, trails: [] }, { status: 500 });
  }
}
