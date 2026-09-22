import { TripPlanner } from "@/components/assistant/TripPlanner";
import { getPlannerContext } from "@/lib/assistant/context";
export const metadata = { title: "Plan a trip — TrailPack", description: "Find a trail, prepare your gear, and build a pack with local AI and your own trip history." };
export const dynamic = "force-dynamic";
export default async function PlanPage({ searchParams }: { searchParams:Promise<{ region?:string }> }) {
  const context = await getPlannerContext();
  const params = await searchParams;
  const region = typeof params.region === "string" ? params.region.slice(0,100) : "";
  return <TripPlanner key={`${context.userId ?? "guest"}:${region}`} context={context} initialRegion={region} />;
}
