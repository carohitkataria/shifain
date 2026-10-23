import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

/** The profile now lives in Settings. */
export default async function ProfileMoved({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${isLocale(locale) ? locale : DEFAULT_LOCALE}/portal/patient/settings`);
}
