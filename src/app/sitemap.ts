import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { getContent } from "@/lib/store";
import { listDiseases, publishedDoctors, publishedHospitals } from "@/lib/catalogue";

// Built when asked, so a newly published hospital is in it without a redeploy.
export const dynamic = "force-dynamic";

const base = () => (process.env.BASE_URL?.trim() || "https://shifain.com").replace(/\/$/, "");

/**
 * Every public page, in every language, with each page's other language
 * versions listed beside it (hreflang): that is how search engines pair the
 * thirteen versions of one page. Plans, portals and the console never appear.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.SHIFAIN_NOINDEX === "1") return [];
  const [content, diseases, hospitals, doctors] = await Promise.all([
    getContent(),
    listDiseases().catch(() => []),
    publishedHospitals({ limit: 500 }).catch(() => []),
    publishedDoctors(1000).catch(() => []),
  ]);
  const paths = [
    "",
    "/treatments",
    "/conditions",
    "/hospitals",
    "/doctors",
    "/faq",
    "/privacy",
    "/terms",
    ...content.specialties.items.map((item) => `/treatments/${item.slug}`),
    ...diseases.map((item) => `/conditions/${item._id}`),
    ...hospitals.map((item) => `/hospitals/${item._id}`),
    ...doctors.map((item) => `/doctors/${item._id}`),
  ];
  const root = base();
  return paths.flatMap((path) => {
    const languages = Object.fromEntries(LOCALES.map((locale) => [LOCALE_META[locale].htmlLang, `${root}/${locale}${path}`]));
    return LOCALES.map((locale) => ({ url: `${root}/${locale}${path}`, alternates: { languages } }));
  });
}
