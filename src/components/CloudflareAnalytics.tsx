"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Cloudflare Web Analytics (free, no cookies), when a site token is set.
 * Never on a patient's own pages: a plan's address carries its case number,
 * and those pages are nobody else's business. "spa: false" keeps it from
 * following the visitor onto such a page after the first load.
 */
const PRIVATE = /^\/[a-z]{2}\/(plan|portal)(\/|$)/;

export function CloudflareAnalytics({ token }: { token: string | null }) {
  const pathname = usePathname();
  if (!token || PRIVATE.test(pathname)) return null;
  return (
    <Script
      id="cf-web-analytics"
      strategy="afterInteractive"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token, spa: false })}
    />
  );
}
