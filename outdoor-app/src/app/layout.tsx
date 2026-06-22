import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { BottomNav } from "@/components/nav/BottomNav";
import { DeployBanner } from "@/components/nav/DeployBanner";
import { NavBar } from "@/components/nav/NavBar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Outdoor OS — Trails, Maps & Adventure",
  description:
    "Your unified outdoor operating system for trail discovery, maps, and adventure planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full bg-stone-50 font-sans text-stone-900 antialiased">
        <NavBar />
        <DeployBanner />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
