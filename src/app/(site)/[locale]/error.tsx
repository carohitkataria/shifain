"use client";

import { useEffect } from "react";
import { SiteProblem } from "@/components/SiteProblem";

/** An unexpected error on a page: never a blank screen or a stack trace. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[shifain] page error", error.digest ?? error.message);
  }, [error]);
  return <SiteProblem kind="broken" onRetry={reset} />;
}
