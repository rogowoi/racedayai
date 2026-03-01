"use client";

export function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-float-slow dark:bg-primary/15" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl animate-float-slow-reverse dark:bg-accent/15" />
    </div>
  );
}
