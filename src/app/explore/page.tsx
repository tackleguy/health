import Image from "next/image";
import Link from "next/link";
import { getTrails } from "@/lib/data";
import { FeaturedTrailCard } from "@/components/trails/FeaturedTrailCard";
import { HomeSearch } from "@/components/home/HomeSearch";

export default async function ExplorePage() {
  const trails = await getTrails().catch(() => []);
  const featured = [...trails].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 8);

  return (
    <div className="pb-24 md:pb-10">
      <section className="relative min-h-[320px] overflow-hidden">
        <Image
          src="/images/splash-image.jpg"
          alt="Mountain trail"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/50 via-forest/80 to-background" />
        <div className="relative mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="section-label text-sage">Explore</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-cream sm:text-5xl">
            Find your next adventure
          </h1>
          <p className="mt-3 max-w-md text-sage">
            Discover trails, ski resorts, and plan your route — then record it with live GPS.
          </p>
          <div className="mt-6">
            <HomeSearch />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explore/trails" className="btn-primary">
              Browse trails
            </Link>
            <Link href="/map" className="btn-ghost">
              Open map
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mt-8 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="section-label">Curated</p>
            <h2 className="font-display text-xl font-semibold text-cream">
              Top picks for you
            </h2>
            <div className="scrollbar-hide -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
              {featured.map((trail) => (
                <FeaturedTrailCard key={trail.id} trail={trail} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto mt-10 max-w-2xl px-4 sm:px-6">
        <p className="section-label">Categories</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/explore/trails",
              title: "Trails",
              desc: "Hikes, reviews, Start Hike GPS",
              emoji: "🥾",
            },
            {
              href: "/explore/ski",
              title: "Ski resorts",
              desc: "Resort maps, Start Ski Day GPS",
              emoji: "⛷",
            },
            {
              href: "/map",
              title: "Adventure map",
              desc: "Trails, parks, runs & lifts",
              emoji: "🗺",
              wide: true,
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`card-lift surface-card group flex items-center gap-4 p-5 ${card.wide ? "sm:col-span-2" : ""}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-accent/10 text-2xl">
                {card.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-cream group-hover:text-accent">
                  {card.title}
                </h2>
                <p className="text-sm text-mist">{card.desc}</p>
              </div>
              <span className="text-mist transition group-hover:translate-x-0.5 group-hover:text-accent">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
