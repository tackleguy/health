import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/server";
import { normalizeDifficulty } from "@/lib/trail-difficulty";

export async function POST(request: Request) {
  const { supabase, user } = await getAuthUser();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { trail_id, rating, body: reviewBody, difficulty: rawDifficulty } = body;
  const difficulty = normalizeDifficulty(rawDifficulty);

  if (!trail_id || !rating || !difficulty) {
    return NextResponse.json(
      { error: "Trail, star rating, and difficulty are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      trail_id,
      user_id: user.id,
      rating,
      difficulty,
      body: reviewBody ?? null,
    })
    .select("*, profile:profiles(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthUser();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, rating, body: reviewBody, difficulty: rawDifficulty } = body;
  const difficulty = normalizeDifficulty(rawDifficulty);

  if (!id || !rating || !difficulty) {
    return NextResponse.json(
      { error: "Review id, star rating, and difficulty are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("reviews")
    .update({
      rating,
      difficulty,
      body: reviewBody ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, profile:profiles(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthUser();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
