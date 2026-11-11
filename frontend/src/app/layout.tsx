import type { Metadata } from "next";
import { Outfit, JetBrains_Mono, Fustat, Inter, DM_Mono } from "next/font/google";
import "./globals.css";
import { BRAND, BRAND_FULL } from "@/lib/brand";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// Landing-page type system: Fustat display, Inter text, DM Mono labels.
const fustat = Fustat({ variable: "--font-fustat", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const dmMono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: `${BRAND_FULL} — ${BRAND.tagline}`,
  description: BRAND.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} ${fustat.variable} ${inter.variable} ${dmMono.variable} antialiased scroll-smooth`}>
      <body className="min-h-full bg-white text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
