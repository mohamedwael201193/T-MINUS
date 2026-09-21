"use client";

import { LandingNav } from "./LandingNav";
import { Hero } from "./Hero";
import { Problem } from "./Problem";
import { MentalModel } from "./MentalModel";
import { LifecycleMap } from "./LifecycleMap";
import { OrderExplainer } from "./OrderExplainer";
import { WhyToolsFail } from "./WhyToolsFail";
import { ProofTeaser } from "./ProofTeaser";
import { Safety } from "./Safety";
import { FinalCta } from "./FinalCta";
import { LandingFooter } from "./LandingFooter";

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <MentalModel />
        <LifecycleMap />
        <OrderExplainer />
        <WhyToolsFail />
        <ProofTeaser />
        <Safety />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
