import type { NextRequest } from "next/server";
import { clientIpFrom, publicOriginFrom } from "./request-meta";

/**
 * The address visitors actually use. Behind Render's proxy `request.url` is
 * the internal http://localhost:10000, so a redirect built from it sends the
 * patient nowhere. BASE_URL wins, then an allowed forwarded host, then an
 * allowed Host header (see request-meta for why a forged host is refused).
 */
export function publicOrigin(request: NextRequest): string {
  return publicOriginFrom(request.headers, request.nextUrl.origin);
}

export function publicUrl(request: NextRequest, path: string): URL {
  return new URL(path, publicOrigin(request));
}

/** The caller's address, for rate limits and the sign-in log. */
export function clientAddress(request: { headers: Headers }): string {
  return clientIpFrom(request.headers);
}
