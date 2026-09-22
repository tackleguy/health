"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { BottomNav } from "./BottomNav";
import { AccessibilityAudit } from "@/components/dev/AccessibilityAudit";
export function AppShell({ children, notice }: { children: ReactNode; notice: ReactNode }) {
  const pathname = usePathname();
  const recording = pathname.startsWith("/record/live");
  const standalone = recording || pathname.startsWith("/login") || pathname.startsWith("/signup");
  return <div className={`app-shell${standalone ? " app-shell--standalone" : ""}${recording ? " app-shell--recording" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {!standalone && <NavBar />}
    <div className="app-content"><main id="main-content" tabIndex={-1}>{children}</main>{!standalone && notice}{process.env.NODE_ENV === "development" && <AccessibilityAudit />}</div>
    {!standalone && <BottomNav />}
  </div>;
}
