"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The plan is written after the upload request has already returned, so this
 * waits for it. Polling beats a websocket here: one small request every few
 * seconds, and it recovers by itself if the patient's connection drops.
 */
export function PlanWaiting({ reference }: { reference: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const response = await fetch(`/api/case/${reference}/status`, { cache: "no-store" });
        if (!response.ok) return;
        const { status } = (await response.json()) as { status: string };
        if (!cancelled && status !== "planning") router.refresh();
      } catch {
        // Offline or a blip — the next tick tries again.
      }
    };

    const timer = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reference, router]);

  return (
    <span className="inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand" aria-hidden="true" />
  );
}
