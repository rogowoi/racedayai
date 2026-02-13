"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

export function TssWithTooltip({ tss }: { tss?: number }) {
  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>TSS</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="hover:text-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              <p>
                Training Stress Score: measures the workout intensity and
                duration. A typical 70.3 bike is 150-250 TSS. Higher TSS means
                more fatigue.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="text-lg font-semibold">{tss}</div>
      </div>
    </TooltipProvider>
  );
}
