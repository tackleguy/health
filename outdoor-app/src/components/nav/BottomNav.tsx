"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/explore", label: "Explore", icon: "🗺" },
  { href: "/record", label: "Record", icon: "●", accent: true },
  { href: "/you", label: "You", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

  const hideOn = ["/login", "/signup", "/record/live"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition",
                active ? "text-emerald-700" : "text-stone-500",
              )}
            >
              {link.accent ? (
                <span
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white shadow-md",
                    active ? "bg-emerald-600" : "bg-emerald-500",
                  )}
                >
                  {link.icon}
                </span>
              ) : (
                <span className="text-lg">{link.icon}</span>
              )}
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
