"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Loader2 } from "lucide-react";
import {
  GELS,
  CAFFEINATED_GELS,
  DRINK_MIXES,
  BARS,
  type NutritionProduct,
} from "@/lib/engine/nutrition-products";
import type { SelectedProducts } from "@/lib/engine/nutrition";

interface ProductSwapperProps {
  planId: string;
  selectedProducts?: SelectedProducts;
}

const SLOTS: {
  key: keyof SelectedProducts;
  label: string;
  options: NutritionProduct[];
}[] = [
  { key: "primaryGelId", label: "Primary Gel", options: GELS },
  {
    key: "caffeinatedGelId",
    label: "Caffeinated Gel",
    options: CAFFEINATED_GELS,
  },
  { key: "drinkMixId", label: "Drink Mix", options: DRINK_MIXES },
  { key: "earlyBikeSolidId", label: "Early Bike Solid", options: BARS },
];

export function ProductSwapper({
  planId,
  selectedProducts,
}: ProductSwapperProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selections, setSelections] = useState<
    Partial<Record<keyof SelectedProducts, string>>
  >({
    primaryGelId: selectedProducts?.primaryGelId ?? "",
    caffeinatedGelId: selectedProducts?.caffeinatedGelId ?? "",
    drinkMixId: selectedProducts?.drinkMixId ?? "",
    earlyBikeSolidId: selectedProducts?.earlyBikeSolidId ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}/recompute-nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selections),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update products");
        return;
      }

      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Customize Products
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Nutrition Products</SheetTitle>
          <SheetDescription>
            Swap products and the entire nutrition plan will be recalculated —
            gel counts, timing, bike setup, and transition bags all update.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {SLOTS.map((slot) => (
            <div key={slot.key} className="space-y-1.5">
              <label className="text-sm font-medium">{slot.label}</label>
              <Select
                value={selections[slot.key] || ""}
                onValueChange={(val) =>
                  setSelections((prev) => ({ ...prev, [slot.key]: val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {slot.options.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <span className="flex items-center gap-2">
                        <span>{product.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.carbsG}g
                          {product.caffeineMg > 0
                            ? ` + ${product.caffeineMg}mg caf`
                            : ""}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Show current product info */}
              {selections[slot.key] && (
                <ProductInfo
                  products={slot.options}
                  selectedId={selections[slot.key]!}
                />
              )}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <Button
            onClick={handleApply}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              "Apply Changes"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProductInfo({
  products,
  selectedId,
}: {
  products: NutritionProduct[];
  selectedId: string;
}) {
  const p = products.find((prod) => prod.id === selectedId);
  if (!p) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {p.carbsG}g carbs
      {p.sodiumMg > 0 ? ` · ${p.sodiumMg}mg sodium` : ""}
      {p.caffeineMg > 0 ? ` · ${p.caffeineMg}mg caffeine` : ""}
      {p.notes ? ` — ${p.notes}` : ""}
    </p>
  );
}
