"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the site's own counter that a page was opened: the path, where the
 * visitor came from and their time zone (for the country). No cookie, no
 * storage, no third party. Honours "Do Not Track" and Global Privacy Control.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;
    const body = JSON.stringify({
      path: `${location.pathname}${location.search}`,
      // Where they came from matters only for the page they landed on.
      referrer: first.current ? document.referrer : "",
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    first.current = false;
    try {
      if (!navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/visit", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
      }
    } catch {
      /* a lost count is never the visitor's problem */
    }
  }, [pathname]);

  return null;
}
