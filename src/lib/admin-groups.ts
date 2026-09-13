import { SECTION_LABELS, type SectionId, type SiteContent } from "./content-types";

export type GroupKey = keyof SiteContent & string;

type Group = { key: GroupKey; label: string; hint: string; section?: SectionId };

/** The editable areas of the homepage, in the order the panel lists them. */
export const GROUPS: Group[] = [
  { key: "brand", label: "Brand & tagline", hint: "Name and the strapline under the logo" },
  { key: "contact", label: "Contact details", hint: "Phone, WhatsApp and email" },
  { key: "nav", label: "Navigation labels", hint: "Header menu and patient login" },
  { key: "hero", label: SECTION_LABELS.hero, hint: "Headline, buttons and the enquiry form", section: "hero" },
  { key: "stats", label: SECTION_LABELS.stats, hint: "The four numbers under the hero", section: "stats" },
  { key: "usps", label: SECTION_LABELS.usps, hint: "The six points of the star", section: "usps" },
  { key: "journey", label: SECTION_LABELS.journey, hint: "Each stop on the journey path", section: "journey" },
  { key: "specialties", label: SECTION_LABELS.specialties, hint: "Clickable treatment cards and their pages", section: "specialties" },
  { key: "aiPlanner", label: SECTION_LABELS.aiPlanner, hint: "Package lines, prices and what is optional", section: "aiPlanner" },
  { key: "upload", label: SECTION_LABELS.upload, hint: "Dark band inviting a report upload", section: "upload" },
  { key: "tracker", label: SECTION_LABELS.tracker, hint: "Live case tracker and its steps", section: "tracker" },
  { key: "guarantee", label: SECTION_LABELS.guarantee, hint: "Price guarantee and in-app translator", section: "guarantee" },
  { key: "costs", label: SECTION_LABELS.costs, hint: "Starting-from prices", section: "costs" },
  { key: "hospitals", label: SECTION_LABELS.hospitals, hint: "Hospital cards and their numbers", section: "hospitals" },
  { key: "doctors", label: SECTION_LABELS.doctors, hint: "Doctor cards and consult fees", section: "doctors" },
  { key: "comparison", label: SECTION_LABELS.comparison, hint: "Comparison table rows and columns", section: "comparison" },
  { key: "services", label: SECTION_LABELS.services, hint: "Included services star", section: "services" },
  { key: "whyIndia", label: SECTION_LABELS.whyIndia, hint: "Why India star", section: "whyIndia" },
  { key: "partners", label: SECTION_LABELS.partners, hint: "Doctor and hospital panels, including their logins", section: "partners" },
  { key: "stories", label: SECTION_LABELS.stories, hint: "Patient quotes", section: "stories" },
  { key: "faq", label: SECTION_LABELS.faq, hint: "Questions and answers", section: "faq" },
  { key: "closing", label: SECTION_LABELS.closing, hint: "Final call to action before the footer", section: "closing" },
  { key: "footer", label: "Footer", hint: "About text, link columns and disclaimer" },
];

export const findGroup = (key: string): Group | undefined => GROUPS.find((group) => group.key === key);
