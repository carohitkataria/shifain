import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { currentPatient } from "@/lib/patient-auth";
import { isGoogleConfigured } from "@/lib/google-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { LoginCard } from "@/components/LoginCard";

export const dynamic = "force-dynamic";

export default async function PatientLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();

  if (isDatabaseConfigured() && (await currentPatient().catch(() => null))) {
    redirect(`/${locale}/portal/patient`);
  }

  return (
    <>
      <Header content={content} locale={locale} path="/portal/patient/login" />

      <main className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-16">
        <LoginCard locale={locale} googleEnabled={isGoogleConfigured()} />
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
