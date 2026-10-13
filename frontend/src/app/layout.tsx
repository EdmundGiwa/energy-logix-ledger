import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "PetroLedger Energy OS — Every litre, every line, on record",
  description:
    "One operating system for Nigerian energy service contractors: bunkering and e-BDN, pipeline integrity, depot and gantry reconciliation, bulk haulage e-Waybills, NCDMB local content, permits and crew gating. Offline-first, audit-ready.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} antialiased scroll-smooth`}>
      <body className="min-h-full bg-white text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
