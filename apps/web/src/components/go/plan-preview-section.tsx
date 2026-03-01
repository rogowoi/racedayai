"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "./animated-counter";

const TOTAL_SECONDS = 5 * 3600 + 12 * 60 + 43; // 5:12:43

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20, delay },
  }),
};

const slideLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: (delay: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 80, damping: 20, delay },
  }),
};

const popIn = {
  hidden: { opacity: 0, scale: 0 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 12, delay },
  }),
};

const cardEntrance = {
  hidden: { opacity: 0, y: 60, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { type: "spring" as const, stiffness: 60, damping: 18, delay: 0.1 },
  },
};

const powerTargets = [
  { label: "Flats", value: "195W", pct: "73% FTP", highlight: false },
  { label: "Hills", value: "210W", pct: "79% FTP", highlight: true },
  { label: "Descents", value: "165W", pct: "62% FTP", highlight: false },
];

export function PlanPreviewSection() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const [counterDone, setCounterDone] = useState(false);

  const onCounterComplete = useCallback(() => setCounterDone(true), []);

  const anim = isInView && !reduced ? "visible" : "hidden";

  return (
    <section
      ref={ref}
      className="relative min-h-screen min-h-[100dvh] snap-start flex flex-col items-center justify-center px-4 bg-gradient-to-b from-white to-orange-50/50 dark:from-background dark:to-orange-950/10"
      style={{ perspective: 800 }}
    >
      {/* Label */}
      <motion.p
        className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-3"
        variants={reduced ? undefined : fadeUp}
        initial="hidden"
        animate={anim}
        custom={0}
      >
        Example race plan
      </motion.p>

      {/* Card */}
      <motion.div
        className="mx-auto max-w-sm w-full rounded-xl border bg-card p-2 shadow-xl shadow-black/5"
        variants={reduced ? undefined : cardEntrance}
        initial="hidden"
        animate={anim}
      >
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="space-y-0.5">
              <motion.div
                className="text-[10px] font-medium text-primary uppercase tracking-wider"
                variants={reduced ? undefined : fadeUp}
                initial="hidden"
                animate={anim}
                custom={0.3}
              >
                Predicted Finish
              </motion.div>
              <div className="text-2xl font-bold font-mono tracking-tight">
                {reduced ? (
                  "5:12:43"
                ) : (
                  <AnimatedCounter
                    to={TOTAL_SECONDS}
                    duration={2}
                    onComplete={onCounterComplete}
                  />
                )}
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-[10px] text-muted-foreground">
                Confidence
              </div>
              <motion.div
                className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400"
                variants={reduced ? undefined : popIn}
                initial="hidden"
                animate={counterDone || reduced ? "visible" : "hidden"}
                custom={0}
              >
                92% High
              </motion.div>
            </div>
          </div>

          {/* Power Targets */}
          <div className="space-y-1.5">
            <motion.div
              className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              variants={reduced ? undefined : fadeUp}
              initial="hidden"
              animate={anim}
              custom={2.0}
            >
              Bike Power Targets
            </motion.div>
            <div className="grid grid-cols-3 gap-1.5">
              {powerTargets.map((target, i) => (
                <motion.div
                  key={target.label}
                  className={`rounded-lg bg-background p-2 text-center border ${
                    target.highlight ? "border-primary/20" : ""
                  }`}
                  variants={reduced ? undefined : fadeUp}
                  initial="hidden"
                  animate={anim}
                  custom={2.1 + i * 0.1}
                >
                  <div
                    className={`text-[10px] uppercase ${
                      target.highlight
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {target.label}
                  </div>
                  <div
                    className={`font-bold text-base font-mono ${
                      target.highlight ? "text-primary" : ""
                    }`}
                  >
                    {target.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {target.pct}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Weather Alert */}
          <motion.div
            className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-sm border border-amber-200 dark:border-amber-800"
            variants={reduced ? undefined : slideLeft}
            initial="hidden"
            animate={anim}
            custom={2.5}
          >
            <span className="text-base leading-none">&#x26A0;&#xFE0F;</span>
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-100 text-xs">
                Heat Alert &mdash; 31&deg;C
              </span>
              <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                Power reduced 5%. Sodium +800mg/hr.
              </p>
            </div>
          </motion.div>

          {/* Nutrition */}
          <motion.div
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            variants={reduced ? undefined : fadeUp}
            initial="hidden"
            animate={anim}
            custom={2.8}
          >
            <span className="font-semibold text-foreground">Next fuel:</span>
            <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
              Gel #1 at T+0:15
            </span>
            <span>&rarr;</span>
            <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
              75g carbs/hr
            </span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
