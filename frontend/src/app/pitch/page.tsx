import type { Metadata } from "next";
import { BRAND_FULL, BRAND } from "@/lib/brand";
import { PitchDeck } from "@/components/pitch/PitchDeck";

export const metadata: Metadata = {
  title: `Interactive Pitch Deck | ${BRAND_FULL}`,
  description: `${BRAND.tagline} Explore all 19 operational modules, field offline architecture, NCDMB readiness, and 60-day pilot ROI at www.ofshora.com.`,
};

export default function PitchPage() {
  return <PitchDeck />;
}

