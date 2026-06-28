import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { BottomNav } from "@/components/nav/BottomNav";
import { DeployBanner } from "@/components/nav/DeployBanner";
import { NavBar } from "@/components/nav/NavBar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full font-sans text-[var(--foreground)] antialiased">
        <NavBar />
        <DeployBanner />
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
