"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface SyncResponse {
  success: boolean;
  metrics?: {
    ftpWatts: number | null;
    thresholdPaceSec: number | null;
    cssPer100mSec: number | null;
    maxHr: number | null;
    restingHr: number | null;
    weightKg: number | null;
  };
  activitiesProcessed?: number;
  error?: string;
}

interface GarminSyncButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  showIcon?: boolean;
}

export function GarminSyncButton({
  variant = "default",
  size = "default",
  showIcon = true,
}: GarminSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/garmin/sync", {
        method: "POST",
      });

      const data: SyncResponse = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to sync Garmin data");
        return;
      }

      // Format success message with metrics
      let metricsText = "";
      if (data.metrics) {
        const parts = [];
        if (data.metrics.ftpWatts) {
          parts.push(`FTP: ${data.metrics.ftpWatts}W`);
        }
        if (data.metrics.thresholdPaceSec) {
          const minutes = Math.floor(data.metrics.thresholdPaceSec / 60);
          const seconds = data.metrics.thresholdPaceSec % 60;
          parts.push(
            `Run pace: ${minutes}:${seconds.toString().padStart(2, "0")}/km`
          );
        }
        if (data.metrics.cssPer100mSec) {
          const minutes = Math.floor(data.metrics.cssPer100mSec / 60);
          const seconds = data.metrics.cssPer100mSec % 60;
          parts.push(
            `Swim: ${minutes}:${seconds.toString().padStart(2, "0")}/100m`
          );
        }
        if (data.metrics.restingHr) {
          parts.push(`Resting HR: ${data.metrics.restingHr} bpm`);
        }
        if (data.metrics.weightKg) {
          parts.push(`Weight: ${data.metrics.weightKg} kg`);
        }
        if (parts.length > 0) {
          metricsText = ` (${parts.join(", ")})`;
        }
      }

      setStatus("success");
      setMessage(
        `Synced ${data.activitiesProcessed} activities${metricsText}`
      );

      // Clear success message after 5 seconds
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 5000);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Network error during sync"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant={variant}
        size={size}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            {showIcon && <RefreshCw className="h-4 w-4" />}
            Sync from Garmin
          </>
        )}
      </Button>

      {message && (
        <div
          className={`text-sm flex items-center gap-2 ${
            status === "success"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {status === "success" ? (
            <>
              <CheckCircle className="h-4 w-4" />
              {message}
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              {message}
            </>
          )}
        </div>
      )}
    </div>
  );
}
