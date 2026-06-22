import Image from "next/image";
import Link from "next/link";

export default function ExplorePage() {
  return (
    <div className="pb-24 md:pb-8">
      <section className="relative overflow-hidden bg-stone-900 text-white">
        <Image
          src="/images/splash-image.jpg"
          alt="Mountain trail"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <Image
            src="/images/logo.png"
            alt="Outdoor OS"
            width={48}
            height={48}
            className="mb-4 rounded-lg"
          />
          <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">Explore outdoors</h1>
          <p className="mt-3 max-w-lg text-stone-300">
            Discover trails, ski resorts, and plan your next adventure — then record it with GPS.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/explore/trails"
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-6">
              <Image
                src="/images/trail-mark.png"
                alt=""
                width={40}
                height={40}
                className="opacity-80"
              />
              <div>
                <h2 className="font-semibold text-stone-900 group-hover:text-emerald-700">
                  Trails
                </h2>
                <p className="text-sm text-stone-500">Hikes, reviews, Start Hike GPS</p>
              </div>
            </div>
          </Link>

          <Link
            href="/explore/ski"
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-4 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-2xl">
                ⛷
              </span>
              <div>
                <h2 className="font-semibold text-stone-900 group-hover:text-sky-700">
                  Ski resorts
                </h2>
                <p className="text-sm text-stone-500">Resort maps, Start Ski Day GPS</p>
              </div>
            </div>
          </Link>

          <Link
            href="/map"
            className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:col-span-2"
          >
            <div className="flex items-center gap-4 p-6">
              <Image
                src="/images/park-mark.png"
                alt=""
                width={40}
                height={40}
                className="opacity-80"
              />
              <div>
                <h2 className="font-semibold text-stone-900 group-hover:text-emerald-700">
                  Map
                </h2>
                <p className="text-sm text-stone-500">Interactive trail and park map</p>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
