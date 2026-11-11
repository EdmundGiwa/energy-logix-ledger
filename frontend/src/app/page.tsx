import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { BuiltFor } from "@/components/landing/BuiltFor";
import { Problem } from "@/components/landing/Problem";
import { FeatureStack } from "@/components/landing/FeatureStack";
import { Steps } from "@/components/landing/Steps";
import { Capabilities } from "@/components/landing/Capabilities";
import { Stats } from "@/components/landing/Stats";
import { Offshore } from "@/components/landing/Offshore";
import { Modules } from "@/components/landing/Modules";
import { CorePlatform } from "@/components/landing/CorePlatform";
import { Corridor } from "@/components/landing/Corridor";
import { Compliance, Integrations } from "@/components/landing/Compliance";
import { Pricing } from "@/components/landing/Pricing";
import { Roadmap } from "@/components/landing/Roadmap";
import { Security } from "@/components/landing/Security";
import { Closing } from "@/components/landing/Closing";
import { RulePlus } from "@/components/landing/primitives";

export default function Home() {
  return (
    <main className="landing relative overflow-x-clip bg-white">
      <Navbar />
      <Hero />
      <BuiltFor />
      <RulePlus />
      <Problem />
      <RulePlus />
      <FeatureStack />
      <RulePlus />
      <Steps />
      <Capabilities />
      <Stats />
      <RulePlus />
      <Offshore />
      <Modules />
      <CorePlatform />
      <Corridor />
      <RulePlus />
      <Compliance />
      <Integrations />
      <RulePlus />
      <Pricing />
      <Roadmap />
      <Security />
      <Closing />
    </main>
  );
}
