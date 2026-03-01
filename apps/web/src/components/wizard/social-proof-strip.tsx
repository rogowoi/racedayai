"use client";

import { Users, Database, MapPin, Zap } from "lucide-react";

const proofByStep: Record<number, { icon: React.ElementType; text: string }> = {
  1: { icon: Users, text: "Join 2,000+ triathletes who race smarter" },
  2: { icon: Database, text: "Based on data from 15,000+ race performances" },
  3: { icon: MapPin, text: "500+ races in our database with verified course data" },
};

const fallback = { icon: Zap, text: "Plans generated in under 60 seconds" };

export function SocialProofStrip({ step }: { step: number }) {
  const { icon: Icon, text } = proofByStep[step] || fallback;

  return (
    <div className="flex items-center justify-center gap-2 py-4 mt-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <p className="text-xs text-muted-foreground/60">{text}</p>
    </div>
  );
}
