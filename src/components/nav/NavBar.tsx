"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchBar } from "@/components/search/SearchBar";
import clsx from "clsx";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/map", label: "Map" },
  { href: "/record", label: "Record" },
  { href: "/", label: "Log" },
  { href: "/you", label: "Profile" },
];

export function NavBar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then((result) => {
      setUserEmail(result.data.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const hideOn = ["/login", "/signup", "/record/live"];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;

  return (
    <header className="sticky top-0 z-50 hidden glass-panel-dark md:block">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-forest">
            ⛰
          </span>
          <span className="font-display text-lg font-semibold text-cream">
            Outdoor OS
          </span>
        </Link>

        <div className="min-w-0 flex-1 max-w-md">
          <SearchBar variant="dark" />
        </div>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-sage hover:bg-white/5 hover:text-cream",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {userEmail ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-ghost !py-2 !text-sm"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-sage hover:text-cream">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary !py-2 !text-sm">
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
