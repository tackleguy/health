import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { GearPageClient } from "@/components/gear/GearPageClient";

export default async function GearPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login?next=/gear");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 pb-24 sm:px-6 md:pb-10 lg:px-10">
      <GearPageClient userId={user.id} />
    </div>
  );
}
