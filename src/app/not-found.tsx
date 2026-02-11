import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="bg-orange-100 dark:bg-orange-900/20 rounded-2xl p-4">
            <Zap className="h-12 w-12 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
          <p className="text-muted-foreground">
            Looks like you took a wrong turn. Even the best triathletes miss a
            marker sometimes.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button asChild size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/wizard">Build a Race Plan</Link>
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
