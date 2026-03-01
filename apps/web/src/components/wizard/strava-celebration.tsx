"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StravaCelebrationProps {
  metrics: {
    ftp?: number | null;
    thresholdPace?: string | null;
    css?: string | null;
    weight?: number | null;
    maxHr?: number | null;
  };
  onDismiss: () => void;
}

export function StravaCelebration({ metrics, onDismiss }: StravaCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const items: { label: string; value: string }[] = [];
  if (metrics.ftp) items.push({ label: "FTP", value: `${metrics.ftp}W` });
  if (metrics.thresholdPace) items.push({ label: "Run Pace", value: `${metrics.thresholdPace}/km` });
  if (metrics.css) items.push({ label: "Swim CSS", value: `${metrics.css}/100m` });
  if (metrics.weight) items.push({ label: "Weight", value: `${metrics.weight}kg` });
  if (metrics.maxHr) items.push({ label: "Max HR", value: `${metrics.maxHr}bpm` });

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={handleDismiss}
    >
      <div
        className={cn(
          "bg-card border rounded-2xl shadow-lg p-6 max-w-sm w-full space-y-4 transition-all duration-300",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">We found your data!</h3>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.label} className="bg-muted/50 rounded-lg px-3 py-2">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Your race plan will be more accurate with this data
        </p>
      </div>
    </div>
  );
}
