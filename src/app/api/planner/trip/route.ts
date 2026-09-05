import { NextResponse } from "next/server";
import { getTrail } from "@/lib/data";
import {
  getTrailCampsites,
  getTrailWaterSources,
} from "@/lib/trails";
import { createClient } from "@/lib/supabase/server";
import { planBackpackingTrip } from "@/lib/planner/trip";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      trailId?: string;
      days?: number;
      startDate?: string;
      partySize?: number;
      preferences?: string;
    };

    const trailId = body.trailId;
    const days = body.days ?? 1;

    let trail = null;
    let campsites: Awaited<ReturnType<typeof getTrailCampsites>> = [];
    let water: Awaited<ReturnType<typeof getTrailWaterSources>> = [];

    if (trailId) {
      trail = await getTrail(trailId);
      const supabase = await createClient();
      if (supabase) {
        [campsites, water] = await Promise.all([
          getTrailCampsites(supabase, trailId),
          getTrailWaterSources(supabase, trailId),
        ]);
      }
    }

    const result = planBackpackingTrip(trail, campsites, water, {
      trailId,
      days,
      startDate: body.startDate,
      partySize: body.partySize,
      preferences: body.preferences,
    });

    return NextResponse.json({ plan: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Trip planning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
