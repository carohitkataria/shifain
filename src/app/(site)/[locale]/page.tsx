import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { Guarantee, Journey, Services, Usps, WhyIndia } from "@/components/sections/Feature";
import { Comparison, Costs, Doctors, Hospitals, Specialties, Stats } from "@/components/sections/Catalog";
import { Faq, Partners, Planner, Stories } from "@/components/sections/Engage";
import { Closing, Tracker, Upload } from "@/components/sections/Band";
import { SECTION_IDS, type SectionId, type SiteContent } from "@/lib/content-types";
import { getContent } from "@/lib/store";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

type SectionProps = { content: SiteContent; locale: Locale };

/** Every homepage section, keyed so the admin panel can order and hide them. */
const SECTIONS: Record<SectionId, (props: SectionProps) => React.ReactElement> = {
  hero: Hero,
  stats: Stats,
  usps: Usps,
  journey: Journey,
  specialties: Specialties,
  aiPlanner: Planner,
  upload: Upload,
  tracker: Tracker,
  guarantee: Guarantee,
  costs: Costs,
  hospitals: Hospitals,
  doctors: Doctors,
  comparison: Comparison,
  services: Services,
  whyIndia: WhyIndia,
  partners: Partners,
  stories: Stories,
  faq: Faq,
  closing: Closing,
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();

  const visible = SECTION_IDS.filter((id) => content.sections[id]?.enabled !== false).sort(
    (a, b) => (content.sections[a]?.order ?? 0) - (content.sections[b]?.order ?? 0),
  );

  return (
    <>
      <Header content={content} locale={locale} />
      <main>
        {visible.map((id) => {
          const SectionComponent = SECTIONS[id];
          return <SectionComponent key={id} content={content} locale={locale} />;
        })}
      </main>
      <Footer content={content} locale={locale} />
    </>
  );
}
