import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailElevationProfile } from "@/lib/trails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ profile: [] });
    const profile = await getTrailElevationProfile(supabase, id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ profile: [] });
  }
}
