"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Context-aware back navigation helper.
 * If user has prior internal navigation history within OmniDiscover, calls router.back()
 * preserving queries, categories, and scroll state.
 * Otherwise, falls back safely to the specified fallback route (e.g. /dashboard or /).
 */
export function useInAppBack(defaultFallback: string = "/dashboard") {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined") {
      const hasHistory = window.history.length > 1;
      const referrer = document.referrer;
      const isInternal =
        referrer &&
        (referrer.startsWith(window.location.origin) ||
          referrer.includes(window.location.host));

      if (hasHistory && isInternal) {
        router.back();
        return;
      }
    }
    router.push(defaultFallback);
  }, [router, defaultFallback]);

  return handleBack;
}
