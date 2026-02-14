"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";

interface ShareButtonProps {
  planId: string;
  existingShareToken?: string | null;
}

export function ShareButton({ planId, existingShareToken }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    ctaHref?: string;
    ctaLabel?: string;
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error",
    cta?: { href: string; label: string },
  ) => {
    setToast({
      message,
      type,
      ctaHref: cta?.href,
      ctaLabel: cta?.label,
    });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = async (value: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  };

  const handleShare = async () => {
    setLoading(true);
    setToast(null);

    try {
      // If already shared, just copy the existing link
      if (existingShareToken) {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/share/${existingShareToken}`;
        const copiedSuccessfully = await copyToClipboard(url);
        if (!copiedSuccessfully) {
          showToast("Copy failed. You can still share from the URL bar.", "error");
          return;
        }
        setCopied(true);
        showToast("Share link copied to clipboard.", "success");
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      const res = await fetch(`/api/plans/${planId}/share`, {
        method: "POST",
      });

      if (res.status === 403) {
        showToast("Sharing requires Pro.", "error", {
          href: "/pricing",
          label: "Upgrade",
        });
        return;
      }

      if (!res.ok) {
        showToast("Failed to generate share link.", "error");
        return;
      }

      const data = await res.json();
      const copiedSuccessfully = await copyToClipboard(data.shareUrl);
      if (!copiedSuccessfully) {
        showToast("Copy failed. Use the address bar link instead.", "error");
        return;
      }
      setCopied(true);
      showToast("Share link copied to clipboard.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to share plan.", "error");
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
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[9999] max-w-xs rounded-md border px-4 py-3 text-sm shadow-xl backdrop-blur-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/90 dark:text-green-200"
              : "border-destructive/20 bg-destructive/10 text-destructive dark:border-destructive/30 dark:bg-destructive/20"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="font-medium">{toast.message}</div>
          {toast.ctaHref && toast.ctaLabel && (
            <Link
              href={toast.ctaHref}
              className="mt-1 inline-block text-xs font-semibold underline underline-offset-2 hover:no-underline"
            >
              {toast.ctaLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
