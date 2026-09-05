import { NextResponse } from "next/server";
import { adminUnauthorizedResponse, isAdminAuthorized } from "@/lib/admin";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return adminUnauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { adapter?: string };
    const adapter = body.adapter ?? "overpass";
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 503 },
      );
    }

    const result = await runIngestionPipeline(supabase, adapter);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
