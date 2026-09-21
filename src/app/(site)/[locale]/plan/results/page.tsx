import { PlanResults } from "@/components/PlanResults";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <PlanResults locale={locale} />
    </section>
  );
}
