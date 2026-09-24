"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SearchBar } from "@/components/search/SearchBar";
import { NavIcon } from "./NavIcon";

const navLinks = [
  { href: "/explore/trails", label: "Explore", icon: "explore" as const },
  { href: "/plan", label: "My trips", icon: "trips" as const },
  { href: "/gear", label: "Gear", icon: "gear" as const },
];
const tools = [
  { href: "/record", label: "Record activity" },
  { href: "/map", label: "Adventure map" },
  { href: "/", label: "Activity log" },
  { href: "/pack-trails", label: "Route guides" },
  { href: "/trails", label: "Custom trails" },
  { href: "/explore/ski", label: "Ski resorts" },
];
function MoreTools() {
  const pathname = usePathname();
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismissOutside(event: PointerEvent) {
      if (disclosure.current && !disclosure.current.contains(event.target as Node)) disclosure.current.open = false;
    }
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, []);
  return <details className="nav-tools" key={pathname} ref={disclosure}
    onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented && disclosure.current?.open) {
        event.preventDefault();
        disclosure.current.open = false;
        disclosure.current.querySelector("summary")?.focus();
      }
    }}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false;
    }}
  ><summary>More tools</summary><nav className="nav-tools-content" aria-label="Additional destinations">{tools.map(tool => <Link key={tool.href} href={tool.href} aria-current={(tool.href === "/" ? pathname === "/" : pathname === tool.href || pathname.startsWith(`${tool.href}/`)) ? "page" : undefined}>{tool.label}</Link>)}<div className="nav-search"><SearchBar /></div></nav></details>;
}

export function NavBar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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

  return <>
    <header className="fieldbook-mobile-header"><Link href="/explore/trails" className="fieldbook-brand"><NavIcon name="mountain" />HikeSync</Link><MoreTools /></header>
    <aside className="fieldbook-nav" aria-label="Main navigation">
      <button type="button" className="fieldbook-nav-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-controls="sidebar-content" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        <NavIcon name="chevron" style={{ transform: collapsed ? undefined : "rotate(180deg)" }} />
        {!collapsed && <span>Collapse sidebar</span>}
      </button>
      <div id="sidebar-content" className="fieldbook-nav-content" hidden={collapsed}>
      <Link href="/explore/trails" className="fieldbook-brand"><NavIcon name="mountain" />HikeSync</Link>
      <nav className="fieldbook-destinations" aria-label="Main destinations">{navLinks.map(link => {
        const active = link.label === "Explore" ? pathname.startsWith("/explore") : pathname.startsWith(link.href);
        return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}><NavIcon name={link.icon} />{link.label}</Link>;
      })}</nav>
      <MoreTools />
      <div className="fieldbook-nav-footer">
        <Link href="/record" className="fieldbook-record"><NavIcon name="record" />Record activity</Link>
        <Link href="/you" className="fieldbook-profile" aria-current={pathname.startsWith("/you") ? "page" : undefined}><NavIcon name="profile" />Profile</Link>
        <div className="fieldbook-auth">{userEmail ? <button onClick={handleSignOut}>Sign out</button> : <><Link href="/login">Log in</Link><Link href="/signup">Create account</Link></>}</div>
      </div>
      </div>
    </aside>
  </>;
}
