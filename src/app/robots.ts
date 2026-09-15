import type { MetadataRoute } from "next";

// Read at request time so the preview can be flipped without a rebuild.
export const dynamic = "force-dynamic";

/**
 * Preview deployments set SHIFAIN_NOINDEX=1 so unfinished copy and placeholder
 * medical content never reach a search index. Production leaves it unset.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SHIFAIN_NOINDEX === "1") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Case plans carry a patient's medical summary and the portals are
      // sign-in only. Neither belongs in a search index, ever.
      disallow: ["/admin", "/api", "/*/plan/", "/*/portal/"],
    },
  };
}
