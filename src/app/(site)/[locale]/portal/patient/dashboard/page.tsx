import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/** The old address of the patient area; the portal lives at /portal/patient now. */
export default async function DashboardRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${isLocale(locale) ? locale : DEFAULT_LOCALE}/portal/patient`);
}
