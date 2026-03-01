"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GradientOrbs } from "./gradient-orbs";

const distances = ["Sprint", "Olympic", "70.3", "IRONMAN"];

const badgePop = {
  hidden: { opacity: 0, scale: 0.5, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 180 + i * 30,
      damping: 12,
      delay: i * 0.1,
    },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14, delay: 0.5 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, delay: 0.7 } },
};

export function BottomCtaSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  const anim = isInView && !reduced ? "visible" : "hidden";

  return (
    <section
      ref={ref}
      className="relative min-h-screen min-h-[100dvh] snap-start flex flex-col items-center justify-center px-4 bg-gradient-to-b from-orange-50/50 to-white dark:from-orange-950/10 dark:to-background overflow-hidden"
    >
      <GradientOrbs />

      <div className="relative z-10 flex flex-col items-center">
        {/* Distance badges */}
        <div className="flex gap-3 mb-6">
          {distances.map((d, i) => (
            <motion.span
              key={d}
              className="text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border"
              variants={reduced ? undefined : badgePop}
              initial="hidden"
              animate={anim}
              custom={i}
            >
              {d}
            </motion.span>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          variants={reduced ? undefined : scaleIn}
          initial="hidden"
          animate={anim}
        >
          <Button
            size="lg"
            className="w-full max-w-xs h-14 text-lg font-semibold animate-cta-glow"
            asChild
          >
            <Link href="/wizard">
              Build My Race Plan
              <ArrowRight className="ml-2 h-5 w-5 animate-nudge-right" />
            </Link>
          </Button>
        </motion.div>

        {/* Subtext */}
        <motion.p
          className="text-xs text-muted-foreground mt-3"
          variants={reduced ? undefined : fadeIn}
          initial="hidden"
          animate={anim}
        >
          Free for your first race &middot; No credit card required
        </motion.p>
      </div>
    </section>
  );
}
