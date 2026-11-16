/**
 * Who is asking, and on which host: read once, the same way everywhere.
 *
 * The client address keys every rate limit. Render passes a caller's own
 * X-Forwarded-For through and only appends to it, so its first value is
 * whatever the caller typed. Cloudflare, in front of Render, sets
 * True-Client-IP (and CF-Connecting-IP) itself, overwriting anything sent,
 * so those come first; failing that, the last X-Forwarded-For entry, which
 * the proxy added. TRUSTED_PROXY_HOPS skips further proxies the operator adds.
 *
 * The host decides where redirects go. A forwarded host is used only if it
 * is the configured BASE_URL's, or on the allow-list, so a forged header can
 * never send a visitor (or a cache) to someone else's site.
 *
 * Pure (no Next imports), so it runs in the middleware and is tested directly.
 */

type HeaderSource = { get(name: string): string | null };
type Env = { BASE_URL?: string; ALLOWED_HOSTS?: string; TRUSTED_PROXY_HOPS?: string };

/** Read key by key: the middleware's runtime only fills in variables named outright. */
const runtimeEnv = (): Env => ({
  BASE_URL: process.env.BASE_URL,
  ALLOWED_HOSTS: process.env.ALLOWED_HOSTS,
  TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS,
});

const IP = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f:]{2,45})$/i;

const clean = (value: string | null | undefined) => {
  const ip = (value ?? "").trim().replace(/^\[|\]$/g, "");
  return IP.test(ip) ? ip : "";
};

export function clientIpFrom(headers: HeaderSource, env: Env = runtimeEnv()): string {
  const direct = clean(headers.get("true-client-ip")) || clean(headers.get("cf-connecting-ip"));
  if (direct) return direct;
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const hops = Math.max(0, Math.min(5, Number.parseInt(env.TRUSTED_PROXY_HOPS ?? "0", 10) || 0));
  const fromProxy = clean(chain[chain.length - 1 - hops]);
  return fromProxy || clean(headers.get("x-real-ip")) || "unknown";
}

/** The hosts this site answers on: BASE_URL's, ALLOWED_HOSTS (comma-separated), Render's own and local development. */
export function isAllowedHost(host: string, env: Env = runtimeEnv()): boolean {
  const name = host.trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(name)) return false;
  const bare = name.replace(/:\d+$/, "");
  if (bare === "localhost" || bare === "127.0.0.1") return true;
  const base = env.BASE_URL ? safeHost(env.BASE_URL) : null;
  if (base && (name === base || bare === base.replace(/:\d+$/, ""))) return true;
  const listed = (env.ALLOWED_HOSTS ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (listed.includes(bare) || listed.includes(name)) return true;
  // The service's own address on Render and the brand's domain, until BASE_URL is set.
  return /(^|\.)shifain(-[a-z0-9-]+)?\.onrender\.com$/.test(bare) || /(^|\.)shifain\.com$/.test(bare);
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The origin to build links and redirects from: BASE_URL when set; otherwise
 * the forwarded host, then Host, whichever is allowed; otherwise the fallback.
 */
export function publicOriginFrom(headers: HeaderSource, fallback: string, env: Env = runtimeEnv()): string {
  if (env.BASE_URL) return env.BASE_URL.replace(/\/$/, "");
  const host = [headers.get("x-forwarded-host")?.split(",")[0], headers.get("host")].map((item) => item?.trim() ?? "").find((item) => item && isAllowedHost(item, env));
  if (!host) return fallback.replace(/\/$/, "");
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  // A public host is always https: a forged X-Forwarded-Proto must not downgrade a redirect.
  return `${local ? "http" : "https"}://${host}`;
}
