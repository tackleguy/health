"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    explore: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        fill="none"
        stroke="currentColor"
      />
    ),
    map: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        fill="none"
        stroke="currentColor"
      />
    ),
    record: (
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    ),
    log: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6h16M4 10h16M4 14h10M4 18h6"
        fill="none"
        stroke="currentColor"
      />
    ),
    profile: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        fill="none"
        stroke="currentColor"
      />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      {icons[name]}
    </svg>
  );
}

const links = [
  { href: "/explore", label: "Explore", icon: "explore" },
  { href: "/map", label: "Map", icon: "map" },
  { href: "/record", label: "Record", icon: "record", accent: true },
  { href: "/", label: "Log", icon: "log" },
  { href: "/you", label: "Profile", icon: "profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  const hideOn = ["/login", "/signup", "/record/live"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-forest/95 backdrop-blur-xl md:hidden">
      <div className="flex items-end justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
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
                "flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-semibold transition",
                active ? "text-accent" : "text-mist",
              )}
            >
              {link.accent ? (
                <span className="flex h-12 w-12 -mt-4 items-center justify-center rounded-full bg-accent text-forest shadow-lg shadow-accent/30">
                  <NavIcon name={link.icon} />
                </span>
              ) : (
                <NavIcon name={link.icon} />
              )}
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
