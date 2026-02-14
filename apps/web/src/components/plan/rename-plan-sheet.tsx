"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit2, Loader2 } from "lucide-react";

interface RenamePlanSheetProps {
  planId: string;
  currentName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function RenamePlanSheet({
  planId,
  currentName,
  variant = "outline",
  size = "sm",
  showIcon = true,
  children,
}: RenamePlanSheetProps) {
  const [open, setOpen] = useState(false);
  const [raceName, setRaceName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!raceName.trim()) {
      setError("Race name is required");
      return;
    }

    if (raceName.length > 200) {
      setError("Race name must be less than 200 characters");
      return;
    }

    if (raceName === currentName) {
      setOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raceName: raceName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename plan");
      }

      // Success - refresh the page to show updated name
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename plan");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant={variant} size={size}>
            {showIcon && <Edit2 className="mr-2 h-4 w-4" />}
            Rename
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Rename Race Plan</SheetTitle>
            <SheetDescription>
              Update the name of your race plan. This will be displayed on your
              dashboard and in the plan details.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raceName">Race Name</Label>
              <Input
                id="raceName"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g., Ironman Chattanooga 2026"
                maxLength={200}
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                {raceName.length}/200 characters
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
