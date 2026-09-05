import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrailPhotos } from "@/lib/trails";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ photos: [] });
    }
    const photos = await getTrailPhotos(supabase, id);
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
