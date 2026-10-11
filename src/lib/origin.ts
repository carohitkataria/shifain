import type { NextRequest } from "next/server";

/**
 * The address visitors actually use. Behind Render's proxy `request.url` is
 * the internal http://localhost:10000, so a redirect built from it sends the
 * patient nowhere. BASE_URL wins, then the forwarded host, then Host.
 */
export function publicOrigin(request: NextRequest): string {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export function publicUrl(request: NextRequest, path: string): URL {
  return new URL(path, publicOrigin(request));
}
