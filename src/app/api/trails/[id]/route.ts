import { NextResponse } from "next/server";
import { getTrail } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const trail = await getTrail(id);
    if (!trail) {
      return NextResponse.json({ error: "Trail not found" }, { status: 404 });
    }
    return NextResponse.json({ trail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch trail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
