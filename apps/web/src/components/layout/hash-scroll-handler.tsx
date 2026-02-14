"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToHash } from "@/lib/hash-scroll";

export function HashScrollHandler() {
  const pathname = usePathname();

  useEffect(() => {
    const run = () => {
      if (!window.location.hash) return;
      // Delay to ensure DOM is fully rendered, especially for client components
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollToHash(window.location.hash);
        }, 100);
      });
    };

    run();
    window.addEventListener("hashchange", run);

    return () => {
      window.removeEventListener("hashchange", run);
    };
  }, [pathname]);

  return null;
}
