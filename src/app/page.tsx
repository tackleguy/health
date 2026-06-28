import Image from "next/image";
import Link from "next/link";
import { getActivities, getWeeklyStats } from "@/lib/activities";
import { getTrails } from "@/lib/data";
import { formatDistance, formatDuration } from "@/lib/gps";
import { ActivityListRow } from "@/components/activities/ActivityListRow";
import { FeaturedTrailCard } from "@/components/trails/FeaturedTrailCard";
import { HomeSearch } from "@/components/home/HomeSearch";
import { getAuthUser } from "@/lib/supabase/server";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function displayName(email: string) {
  const local = email.split("@")[0] ?? "Explorer";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default async function HomePage() {
  const { user } = await getAuthUser();

  const [activities, stats, trails] = await Promise.all([
    user ? getActivities(20) : Promise.resolve([]),
    user ? getWeeklyStats() : Promise.resolve(null),
    getTrails().catch(() => []),
  ]);

  const featuredTrails = [...trails]
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 6);

  return (
    <div className="pb-24 md:pb-10">
      {/* Hero */}
      <section className="relative min-h-[340px] overflow-hidden sm:min-h-[380px]">
        <Image
          src="/images/splash-image.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/60 via-forest/75 to-background" />

        <div className="relative mx-auto max-w-2xl px-4 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-label text-sage">
                {user ? greeting() : "Welcome"}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-cream sm:text-4xl">
                {user ? `${greeting()}, ${displayName(user.email!)}` : "Explore the wild"}
              </h1>
            </div>
            {user && (
              <Link
                href="/you"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-accent/40 bg-surface-elevated font-display text-lg font-semibold text-accent shadow-lg"
              >
                {displayName(user.email!).charAt(0)}
              </Link>
            )}
          </div>

          <div className="mt-6">
            <HomeSearch />
          </div>

          {user && stats && stats.activityCount > 0 && (
            <div className="mt-6 grid grid-cols-4 gap-2 rounded-[var(--radius-xl)] glass-panel-light p-3">
              <WeekStat label="Week" value={String(stats.activityCount)} />
              <WeekStat label="Distance" value={formatDistance(stats.distanceM)} />
              <WeekStat label="Time" value={formatDuration(stats.durationSec)} />
              <WeekStat
                label="Elev"
                value={stats.elevationFt.toLocaleString()}
                unit="ft"
              />
            </div>
          )}
        </div>
      </section>

      {/* Featured trails */}
      {featuredTrails.length > 0 && (
        <section className="mt-8 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="section-label">Discover</p>
                <h2 className="font-display text-xl font-semibold text-cream">
                  Top picks for you
                </h2>
              </div>
              <Link href="/explore/trails" className="text-xs font-semibold text-accent hover:underline">
                See all
              </Link>
            </div>
            <div className="scrollbar-hide -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
              {featuredTrails.map((trail) => (
                <FeaturedTrailCard key={trail.id} trail={trail} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Activity feed */}
      <section className="mx-auto mt-10 max-w-2xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="section-label">Your log</p>
            <h2 className="font-display text-xl font-semibold text-cream">
              Recent adventures
            </h2>
          </div>
          {user && (
            <Link href="/record" className="btn-primary !py-2 !text-xs">
              + Record
            </Link>
          )}
        </div>

        <div className="mt-5 space-y-2">
          {!user ? (
            <div className="surface-card px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-accent/10 text-3xl">
                ⛰
              </div>
              <p className="mt-5 font-display text-xl font-semibold text-cream">
                Track every trail
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
                Sign in to record GPS tracks, explore trails, and build your adventure log.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/signup" className="btn-primary">
                  Join free
                </Link>
                <Link href="/login" className="btn-ghost">
                  Log in
                </Link>
              </div>
            </div>
          ) : activities.length === 0 ? (
            <div className="surface-card px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] bg-accent/10 text-3xl">
                🥾
              </div>
              <p className="mt-5 font-display text-xl font-semibold text-cream">
                No adventures yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
                Hit record on your next hike, run, ride, or ski day.
              </p>
              <Link href="/record" className="btn-primary mt-6">
                Start recording
              </Link>
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityListRow key={activity.id} activity={activity} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function WeekStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-mist">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-cream">
        {value}
        {unit && <span className="ml-0.5 text-[10px] font-medium text-mist">{unit}</span>}
      </p>
    </div>
  );
}
