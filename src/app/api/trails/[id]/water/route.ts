import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailWaterSources } from "@/lib/trails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ water_sources: [] });
    const water_sources = await getTrailWaterSources(supabase, id);
    return NextResponse.json({ water_sources });
  } catch {
    return NextResponse.json({ water_sources: [] });
  }
}
