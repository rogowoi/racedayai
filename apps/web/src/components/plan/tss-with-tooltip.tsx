"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

export function TssWithTooltip({ tss }: { tss?: number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>TSS</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="hover:text-foreground">
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-w-[250px] text-sm">
            <p>
              Training Stress Score: measures the workout intensity and
              duration. A typical 70.3 bike is 150-250 TSS. Higher TSS means
              more fatigue.
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <div className="text-lg font-semibold">{tss}</div>
    </div>
  );
}
