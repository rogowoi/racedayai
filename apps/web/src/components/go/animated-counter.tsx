"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useTransform, animate, motion } from "framer-motion";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  onComplete?: () => void;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 2,
  format = formatTime,
  className,
  onComplete,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const motionValue = useMotionValue(from);
  const display = useTransform(motionValue, (v) => format(Math.round(v)));
  const [current, setCurrent] = useState(format(from));

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => setCurrent(v));
    return unsubscribe;
  }, [display]);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, to, {
      duration,
      ease: "easeOut",
      onComplete,
    });
    return controls.stop;
  }, [isInView, motionValue, to, duration, onComplete]);

  return (
    <motion.span ref={ref} className={className}>
      {current}
    </motion.span>
  );
}
