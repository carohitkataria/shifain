import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { allowHit } from "@/lib/rate-limit";
import { clientIpFrom, isAllowedHost } from "@/lib/request-meta";
import { recordVisit } from "@/lib/visitors";
import { countryOf, deviceOf, isRobot, pageOf, sourceOf } from "@/lib/visitor-rules";

/**
 * POST /api/visit — one page view from the site's own pages (see
 * VisitTracker). Always answers 204 at once; the count is written after the
 * response, so it never slows a page. Robots, other sites and floods are
 * ignored quietly.
 */
export async function POST(request: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  if (!isDatabaseConfigured()) return done;
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isRobot(userAgent)) return done;
  // Only our own pages count: a beacon from another site is not a visit here.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!isAllowedHost(new URL(origin).host)) return done;
    } catch {
      return done;
    }
  }
  const ip = clientIpFrom(request.headers);
  if (!allowHit(`visit:${ip}`, 120, 10 * 60_000) || !allowHit("visit:site", 20_000, 60 * 60_000)) return done;

  let body: { path?: unknown; referrer?: unknown; tz?: unknown };
  try {
    body = JSON.parse((await request.text()).slice(0, 2_000));
  } catch {
    return done;
  }
  const path = typeof body.path === "string" ? body.path : "";
  const where = pageOf(path);
  if (!where) return done;
  const ownHosts = [request.headers.get("host") ?? "", "shifain.com", "shifain-preview.onrender.com"].filter(Boolean);
  const facts = {
    ...where,
    source: sourceOf(typeof body.referrer === "string" ? body.referrer.slice(0, 500) : "", path, ownHosts),
    device: deviceOf(userAgent),
    country: countryOf(request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code"), typeof body.tz === "string" ? body.tz : null),
  };
  after(() => recordVisit(facts, { ip, userAgent }));
  return done;
}
