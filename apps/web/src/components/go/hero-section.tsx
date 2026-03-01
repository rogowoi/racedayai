"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Zap, ChevronDown } from "lucide-react";
import { GradientOrbs } from "./gradient-orbs";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 14 },
  },
};

export function HeroSection() {
  const reduced = useReducedMotion();
  const variants = reduced ? { hidden: {}, visible: {} } : undefined;

  return (
    <section className="relative min-h-screen min-h-[100dvh] snap-start flex flex-col items-center justify-center px-4 bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-background overflow-hidden">
      <GradientOrbs />

      <motion.div
        className="relative z-10 flex flex-col items-center"
        variants={reduced ? undefined : container}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center gap-2 mb-6"
          variants={variants ?? fadeUp}
        >
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">
            RaceDay<span className="text-primary">AI</span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-3xl sm:text-4xl font-extrabold text-center leading-tight max-w-md mb-3"
          variants={variants ?? fadeUp}
        >
          Know your finish time
        </motion.h1>

        <motion.p
          className="text-3xl sm:text-4xl font-extrabold text-center leading-tight max-w-md mb-3 text-primary"
          variants={variants ?? fadeUp}
        >
          before race day.
        </motion.p>

        {/* Subtitle */}
        <motion.p
          className="text-center text-muted-foreground text-base max-w-sm mb-2"
          variants={variants ?? fadeIn}
        >
          AI-powered pacing, nutrition, and weather plan for your next triathlon.
        </motion.p>

        {/* Trust line */}
        <motion.p
          className="text-sm text-muted-foreground mb-5"
          variants={variants ?? fadeIn}
        >
          Free &middot; No credit card &middot; 3 minutes
        </motion.p>

        {/* CTA */}
        <motion.div variants={variants ?? scaleIn}>
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
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown className="h-6 w-6 text-muted-foreground/50 animate-bounce-down" />
      </div>
    </section>
  );
}
