"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-red-100 dark:bg-red-900/20 rounded-2xl p-4">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            Our systems hit a pothole. We're on it.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={() => reset()} size="lg">
            Try Again
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>

        {/* Branding */}
        <div className="pt-6 border-t">
          <p className="text-xs text-muted-foreground">RaceDayAI</p>
        </div>
      </div>
    </div>
  );
}
