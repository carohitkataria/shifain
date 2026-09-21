import { PlanWizard } from "@/components/PlanWizard";

export const dynamic = "force-dynamic";

export default async function WizardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ specialty?: string }>;
}) {
  const { locale } = await params;
  const { specialty } = await searchParams;
  return (
    <section className="mx-auto max-w-4xl px-5 py-10">
      <PlanWizard locale={locale} initialSpecialty={specialty} />
    </section>
  );
}
