import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Problem, HowItWorks } from "@/components/landing/Problem";
import { Modules } from "@/components/landing/Modules";
import { Offshore } from "@/components/landing/Offshore";
import { CorePlatform } from "@/components/landing/CorePlatform";
import { Corridor } from "@/components/landing/Corridor";
import { Compliance, Integrations } from "@/components/landing/Compliance";
import { Pricing } from "@/components/landing/Pricing";
import { Roadmap } from "@/components/landing/Roadmap";
import { Security } from "@/components/landing/Security";
import { Closing } from "@/components/landing/Closing";

export default function Home() {
  return (
    <main className="relative overflow-x-clip">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Offshore />
      <Modules />
      <CorePlatform />
      <Corridor />
      <Compliance />
      <Integrations />
      <Pricing />
      <Roadmap />
      <Security />
      <Closing />
    </main>
  );
}
