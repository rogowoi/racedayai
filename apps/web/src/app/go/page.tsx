"use client";

import { useEffect } from "react";
import { ttqTrack } from "@/components/tiktok-pixel";
import { HeroSection } from "@/components/go/hero-section";
import { PlanPreviewSection } from "@/components/go/plan-preview-section";
import { SocialProofSection } from "@/components/go/social-proof-section";
import { TestimonialSection } from "@/components/go/testimonial-section";
import { BottomCtaSection } from "@/components/go/bottom-cta-section";

export default function TikTokLanding() {
  useEffect(() => {
    ttqTrack("ViewContent", { content_name: "go_landing" });
  }, []);

  return (
    <div className="h-screen h-[100dvh] overflow-y-auto snap-y snap-mandatory">
      <HeroSection />
      <PlanPreviewSection />
      <SocialProofSection />
      <TestimonialSection />
      <BottomCtaSection />
    </div>
  );
}
