import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailTrailheads } from "@/lib/trails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) return NextResponse.json({ trailheads: [] });
    const trailheads = await getTrailTrailheads(supabase, id);
    return NextResponse.json({ trailheads });
  } catch {
    return NextResponse.json({ trailheads: [] });
  }
}
