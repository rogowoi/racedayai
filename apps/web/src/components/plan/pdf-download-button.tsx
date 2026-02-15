"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface PdfDownloadButtonProps {
  planId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PdfDownloadButton({ planId, variant = "outline", size = "sm" }: PdfDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/plans/${planId}/pdf`);

      if (response.status === 403) {
        setError("upgrade");
        return;
      }

      if (!response.ok) {
        setError("Failed to generate PDF. Please try again.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `race-plan-${planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Delay cleanup so download can start
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Download failed. Check your connection and try again.");
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </>
        )}
      </Button>
      {error && (
        <div className="absolute top-full right-0 mt-2 z-50 max-w-xs rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow-lg">
          {error === "upgrade" ? (
            <span>
              PDF download requires a paid plan.{" "}
              <Link href="/pricing" className="underline font-semibold">
                Upgrade
              </Link>
            </span>
          ) : (
            error
          )}
          <button
            type="button"
            className="ml-2 text-destructive/60 hover:text-destructive"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
