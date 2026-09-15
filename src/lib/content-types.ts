import type { Locale } from "./i18n";

/** A string that exists in every supported language. */
export type L = Record<Locale, string>;

export type SectionId =
  | "hero"
  | "stats"
  | "usps"
  | "journey"
  | "specialties"
  | "aiPlanner"
  | "upload"
  | "tracker"
  | "guarantee"
  | "costs"
  | "hospitals"
  | "doctors"
  | "comparison"
  | "services"
  | "whyIndia"
  | "partners"
  | "stories"
  | "faq"
  | "closing";

export const SECTION_IDS: SectionId[] = [
  "hero",
  "stats",
  "usps",
  "journey",
  "specialties",
  "aiPlanner",
  "upload",
  "tracker",
  "guarantee",
  "costs",
  "hospitals",
  "doctors",
  "comparison",
  "services",
  "whyIndia",
  "partners",
  "stories",
  "faq",
  "closing",
];

/** Admin-facing labels for each section of the homepage. */
export const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Hero & enquiry form",
  stats: "Headline numbers",
  usps: "Why ShifaIn (star)",
  journey: "Your journey (path)",
  specialties: "Treatment categories",
  aiPlanner: "AI plan & estimate builder",
  upload: "Upload reports band",
  tracker: "Live case tracker",
  guarantee: "Price guarantee & translator",
  costs: "Indicative costs",
  hospitals: "Hospital network",
  doctors: "Expert doctors",
  comparison: "Treatment comparison",
  services: "Included services (star)",
  whyIndia: "Why India (star)",
  partners: "For doctors & hospitals",
  stories: "Patient stories",
  faq: "Frequently asked questions",
  closing: "Closing call to action",
};

export type SectionState = { enabled: boolean; order: number };

export type StarPoint = { id: string; icon: string; title: L; body: L };
export type JourneyStep = { id: string; icon: string; title: L; body: L };
export type Specialty = { slug: string; icon: string; title: L; body: L; detail: L };
export type CostItem = { id: string; icon: string; title: L; amount: string; note: L };
export type PackageLine = { id: string; icon: string; title: L; note: L; amount: string; included: boolean; optional: boolean };
export type Hospital = { id: string; name: string; city: string; tags: string[]; accreditations: string[]; beds: string; procedures: string; rating: string };
export type Doctor = { id: string; initials: string; name: string; speciality: L; affiliation: string; experience: string; highlight: L; fee: string };
export type ComparisonRow = { id: string; label: L; values: string[] };
export type Story = { id: string; initials: string; name: string; from: L; treatment: L; quote: L };
export type TrackerStep = { id: string; label: L; state: "done" | "current" | "todo" };
export type FaqItem = { id: string; question: L; answer: L };

export type SiteContent = {
  version: number;
  updatedAt: string;

  brand: {
    name: string;
    tagline: L;
    /** Short strapline used under the wordmark in the header. */
    wordmarkTagline: L;
  };

  contact: {
    phone: string;
    whatsapp: string;
    email: string;
  };

  nav: {
    treatments: L;
    hospitals: L;
    doctors: L;
    costEstimate: L;
    packages: L;
    stories: L;
    patientLogin: L;
  };

  sections: Record<SectionId, SectionState>;

  hero: {
    eyebrow: L;
    headline: L;
    headlineAccent: L;
    body: L;
    primaryCta: L;
    secondaryCta: L;
    badges: { id: string; label: L }[];
    form: {
      title: L;
      subtitle: L;
      freeNote: L;
      nameLabel: L;
      namePlaceholder: L;
      phoneLabel: L;
      phonePlaceholder: L;
      countryLabel: L;
      countryPlaceholder: L;
      treatmentLabel: L;
      treatmentPlaceholder: L;
      reportsLabel: L;
      reportsHint: L;
      submit: L;
      privacy: L;
    };
  };

  stats: { items: { id: string; value: string; label: L }[] };

  usps: { eyebrow: L; title: L; body: L; hubLabel: L; points: StarPoint[] };

  journey: { eyebrow: L; title: L; body: L; steps: JourneyStep[]; footnote: L };

  specialties: { eyebrow: L; title: L; body: L; linkLabel: L; items: Specialty[] };

  aiPlanner: {
    eyebrow: L;
    title: L;
    body: L;
    disclaimer: L;
    packageTitle: L;
    packageSubtitle: L;
    includedLabel: L;
    optionalLabel: L;
    totalLabel: L;
    totalNote: L;
    cta: L;
    lines: PackageLine[];
  };

  upload: {
    eyebrow: L;
    title: L;
    body: L;
    dropTitle: L;
    dropNote: L;
    formats: string[];
  };

  tracker: {
    eyebrow: L;
    title: L;
    body: L;
    patientName: L;
    caseMeta: L;
    currentLabel: L;
    steps: TrackerStep[];
  };

  guarantee: {
    eyebrow: L;
    priceTitle: L;
    priceBody: L;
    priceBadge: L;
    translatorTitle: L;
    translatorBody: L;
    translatorBadge: L;
  };

  costs: { eyebrow: L; title: L; body: L; ctaLabel: L; footnote: L; fromLabel: L; items: CostItem[] };

  hospitals: {
    eyebrow: L;
    title: L;
    body: L;
    bedsLabel: L;
    proceduresLabel: L;
    ratingLabel: L;
    viewLabel: L;
    allLabel: L;
    items: Hospital[];
  };

  doctors: { eyebrow: L; title: L; body: L; consultLabel: L; allLabel: L; items: Doctor[] };

  comparison: {
    eyebrow: L;
    title: L;
    body: L;
    subject: L;
    columns: string[];
    rows: ComparisonRow[];
    footnote: L;
    cta: L;
  };

  services: { eyebrow: L; title: L; body: L; hubLabel: L; points: StarPoint[] };

  whyIndia: { eyebrow: L; title: L; body: L; hubLabel: L; points: StarPoint[] };

  partners: {
    eyebrow: L;
    doctorTitle: L;
    doctorBody: L;
    doctorPoints: { id: string; label: L }[];
    doctorCta: L;
    doctorLogin: L;
    hospitalTitle: L;
    hospitalBody: L;
    hospitalPoints: { id: string; label: L }[];
    hospitalCta: L;
    hospitalLogin: L;
  };

  stories: { eyebrow: L; title: L; body: L; items: Story[] };

  faq: { eyebrow: L; title: L; body: L; items: FaqItem[] };

  closing: {
    title: L;
    body: L;
    primaryCta: L;
    secondaryCta: L;
  };

  footer: {
    about: L;
    disclaimer: L;
    copyright: L;
    columns: { id: string; title: L; links: { id: string; label: L; href: string }[] }[];
  };
};
