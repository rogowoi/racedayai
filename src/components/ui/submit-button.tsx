"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children, className, ...props }: any) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className={className} {...props}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Plan...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
