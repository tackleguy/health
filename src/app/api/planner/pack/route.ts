import { NextResponse } from "next/server";
import { planPack } from "@/lib/planner/pack";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      days?: number;
      season?: "summer" | "shoulder" | "winter";
      elevationFt?: number;
      bearCanisterRequired?: boolean;
    };

    const result = planPack({
      days: body.days ?? 1,
      season: body.season ?? "summer",
      elevationFt: body.elevationFt,
      bearCanisterRequired: body.bearCanisterRequired,
    });

    return NextResponse.json({ pack: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pack planning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
