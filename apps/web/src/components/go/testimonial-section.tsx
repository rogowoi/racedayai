"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const cardUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 70, damping: 18 },
  },
};

const starPop = {
  hidden: { opacity: 0, scale: 0, rotate: -30 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 12,
      delay: 0.3 + i * 0.1,
    },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

const slideRight = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20, delay: 1.2 },
  },
};

export function TestimonialSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  const anim = isInView && !reduced ? "visible" : "hidden";

  return (
    <section
      ref={ref}
      className="min-h-screen min-h-[100dvh] snap-start flex flex-col items-center justify-center px-4"
    >
      <motion.div
        className="max-w-sm mx-auto rounded-xl border bg-card p-5 w-full"
        variants={reduced ? undefined : cardUp}
        initial="hidden"
        animate={anim}
      >
        {/* Stars */}
        <div className="flex gap-0.5 mb-2">
          {[...Array(5)].map((_, j) => (
            <motion.span
              key={j}
              className="text-orange-500 text-lg"
              variants={reduced ? undefined : starPop}
              initial="hidden"
              animate={anim}
              custom={j}
            >
              ★
            </motion.span>
          ))}
        </div>

        {/* Quote */}
        <motion.p
          className="text-sm leading-relaxed mb-3 text-foreground"
          variants={reduced ? undefined : fadeUp}
          initial="hidden"
          animate={anim}
          custom={0.8}
        >
          &ldquo;I used to wing my nutrition and bonked at mile 18 every time.
          RaceDayAI&apos;s plan had me fueling every 30 minutes and I actually
          negative-split the run.&rdquo;
        </motion.p>

        {/* Avatar */}
        <motion.div
          className="flex items-center gap-3"
          variants={reduced ? undefined : slideRight}
          initial="hidden"
          animate={anim}
        >
          <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">SK</span>
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Sarah K.</p>
            <p className="text-xs text-muted-foreground">
              First IRONMAN 70.3 finisher
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
