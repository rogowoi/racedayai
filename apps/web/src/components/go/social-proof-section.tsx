"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FlaskConical, DollarSign, Timer, Shield } from "lucide-react";

const points = [
  { icon: FlaskConical, stat: "Sports Science", detail: "Peer-reviewed physiology" },
  { icon: DollarSign, stat: "$150 Value", detail: "Same as a coach charges" },
  { icon: Timer, stat: "3 Minutes", detail: "Data to race plan" },
  { icon: Shield, stat: "All Distances", detail: "Sprint to IRONMAN" },
];

const iconPop = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 12, delay: i * 0.15 },
  }),
};

const textSlide = {
  hidden: { opacity: 0, x: -15 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20, delay: i * 0.15 + 0.05 },
  }),
};

export function SocialProofSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  const anim = isInView && !reduced ? "visible" : "hidden";

  return (
    <section
      ref={ref}
      className="min-h-screen min-h-[100dvh] snap-start flex flex-col items-center justify-center px-4 border-y bg-muted/30"
    >
      <div className="grid grid-cols-2 gap-5 max-w-sm mx-auto">
        {points.map((point, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <motion.div
              className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"
              variants={reduced ? undefined : iconPop}
              initial="hidden"
              animate={anim}
              custom={i}
            >
              <point.icon className="h-5 w-5" />
            </motion.div>
            <motion.div
              variants={reduced ? undefined : textSlide}
              initial="hidden"
              animate={anim}
              custom={i}
            >
              <div className="text-sm font-bold leading-tight">{point.stat}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {point.detail}
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
