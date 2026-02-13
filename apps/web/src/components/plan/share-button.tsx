"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";

interface ShareButtonProps {
  planId: string;
  existingShareToken?: string | null;
}

export function ShareButton({ planId, existingShareToken }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);

    try {
      // If already shared, just copy the existing link
      if (existingShareToken) {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/share/${existingShareToken}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      const res = await fetch(`/api/plans/${planId}/share`, {
        method: "POST",
      });

      if (res.status === 403) {
        setError("Sharing requires a Pro subscription");
        setTimeout(() => setError(null), 3000);
        return;
      }

      if (!res.ok) {
        setError("Failed to generate share link");
        setTimeout(() => setError(null), 3000);
        return;
      }

      const data = await res.json();
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to share plan");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : copied ? (
          <Check className="mr-2 h-4 w-4 text-green-600" />
        ) : (
          <Share2 className="mr-2 h-4 w-4" />
        )}
        {copied ? "Copied!" : "Share"}
      </Button>
      {error && (
        <div className="absolute top-full mt-1 right-0 whitespace-nowrap bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}
