/**
 * Headers every response carries. The CSP here only sets what cannot break a
 * page (no framing, no plugins, no <base> rewriting); a full script policy
 * should go in as Content-Security-Policy-Report-Only first and be watched.
 */
const SECURITY_HEADERS = [
  // Browsers remember to use https for two years, subdomains included.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No other site may frame the console, the patient app or a plan.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  // The voice chat needs this site's own microphone; nothing else is used.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Patients add scans from the portal through a server action; 1 MB (the default) is too small.
  experimental: { serverActions: { bodySizeLimit: "32mb" } },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
