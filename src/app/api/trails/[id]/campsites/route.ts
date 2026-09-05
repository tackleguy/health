import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailCampsites } from "@/lib/trails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ campsites: [] });
    const campsites = await getTrailCampsites(supabase, id);
    return NextResponse.json({ campsites });
  } catch {
    return NextResponse.json({ campsites: [] });
  }
}
