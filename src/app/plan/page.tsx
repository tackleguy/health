import { TripPlanner } from "@/components/assistant/TripPlanner";
import { getPlannerContext } from "@/lib/assistant/context";
export const metadata = { title: "Plan a trip — Outdoor OS", description: "Find a trail, prepare your gear, and build a pack with local AI and your own trip history." };
export const dynamic = "force-dynamic";
export default async function PlanPage() {
  const context = await getPlannerContext();
  return <TripPlanner key={context.userId ?? "guest"} context={context} />;
}
