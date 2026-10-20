import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { BookingPanel } from "@/components/BookingForm";
import { ServiceTabs, type ServiceGroup } from "@/components/ServiceTabs";
import { getContent } from "@/lib/store";
import { isDatabaseConfigured } from "@/lib/db";
import { listCategories, listSpecialties, type Disease, type Doctor } from "@/lib/catalogue";
import {
  activePackages,
  capabilityNames,
  centresOfExcellence,
  conditionsFor,
  doctorSpecialtyCodes,
  doctorsAtHospital,
  groupName,
  listedHospital,
} from "@/lib/directory";
import { FACILITIES, FACILITY_GROUPS, accreditationBody } from "@/lib/onboarding-masters";
import { accreditationStatus, inForce } from "@/lib/onboarding-rules";
import { mediaUrl } from "@/lib/media";
import { HOSPITAL_COPY, HOSPITAL_PAGE as P } from "@/lib/hospital-copy";
import { BOOKING_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** How many doctor cards show before "See all". */
const DOCTORS_SHOWN = 6;

function Section({ id, title, children, action }: { id: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-8" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <h2 id={`${id}-title`} className="text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] font-extrabold leading-tight tracking-tight text-ink">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** One cell of the snapshot grid: an icon, a label, and the value or a jump to its section. */
function Fact({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 p-3.5 sm:flex-row sm:gap-3 sm:p-5">
      <Icon name={icon} className="h-6 w-6 flex-none text-violet sm:mt-0.5" />
      <div className="min-w-0">
        <dt className="text-sm text-ink-soft">{label}</dt>
        <dd className="mt-0.5 font-extrabold text-ink">{children}</dd>
      </div>
    </div>
  );
}

const CATEGORY_ICON: Record<string, string> = {
  "cardiac-care": "heart",
  oncology: "ribbon",
  haematology: "ribbon",
  neurosciences: "brain",
  orthopaedics: "bone",
  transplant: "organ",
  nephrology: "organ",
  urology: "organ",
  gastroenterology: "organ",
  "complex-surgery": "organ",
  bariatric: "organ",
  fertility: "baby",
  gynaecology: "baby",
  paediatrics: "baby",
  ophthalmology: "eye",
};

const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

const money = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "INR" ? "₹" : `${currency} `}${Math.round(value).toLocaleString("en-US")}`;

const waHref = (number: string, text: string) => `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export default async function HospitalProfile({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) notFound();
  // Only a published hospital has a public page. Everything else in the
  // catalogue is research, and research is not a recommendation.
  const hospital = await listedHospital(id);
  if (!hospital) notFound();

  const [content, specialties, categories, doctors, coe, packages, group, capabilities, conditions] = await Promise.all([
    getContent(),
    listSpecialties(),
    listCategories(),
    doctorsAtHospital(id),
    centresOfExcellence(id),
    activePackages(id),
    groupName(hospital.groupId),
    capabilityNames(),
    conditionsFor(hospital.specialtyCodes ?? []),
  ]);

  // "Artemis Hospital, Gurgaon": the city is part of how patients name a hospital.
  const name = hospital.name.toLowerCase().includes(hospital.city.toLowerCase()) ? hospital.name : `${hospital.name}, ${hospital.city}`;
  const path = `/${locale}/hospitals/${id}`;
  const specialtyOf = (code: string) => specialties.find((item) => item._id === code);
  const specialtyName = (code: string) => t(specialtyOf(code)?.name, locale) || code;
  const categoryName = (code: string) => t(categories.find((item) => item._id === code)?.name, locale) || code;

  const about = (locale === "ru" ? hospital.aboutRu : locale === "uz" ? hospital.aboutUz : null) || hospital.about;
  const records = hospital.accreditationRecords ?? [];
  const accreditations = records.length
    ? records
        .map((record) => ({ record, status: accreditationStatus(record) }))
        .filter(({ status }) => status !== "expired" && status !== "revoked")
        .map(({ record, status }) => ({
          key: record.id,
          name: accreditationBody(record.code)?.name ?? record.code,
          body: accreditationBody(record.code)?.issuingBody ?? null,
          validTo: inForce(status) ? record.validTo : null,
        }))
    : (hospital.accreditations ?? []).map((item) =>
        typeof item === "string"
          ? { key: item, name: item, body: null, validTo: null }
          : { key: item.name ?? item.body, name: item.name ?? item.body, body: null, validTo: item.validUntil },
      );

  // Doctors grouped the way patients look for them: by the kind of care, with a count.
  const byCategory = new Map<string, Set<string>>();
  for (const { doctor } of doctors) {
    for (const code of doctorSpecialtyCodes(doctor)) {
      const category = specialtyOf(code)?.categoryCode;
      if (category) byCategory.set(category, (byCategory.get(category) ?? new Set()).add(doctor._id));
    }
  }
  const doctorTiles = [...byCategory.entries()]
    .map(([category, ids]) => ({ category, count: ids.size }))
    .sort((a, b) => b.count - a.count || categoryName(a.category).localeCompare(categoryName(b.category)));
  // Most experienced first, so the cards a patient sees first carry the most weight.
  const ranked = [...doctors].sort((a, b) => (b.doctor.experienceYears ?? 0) - (a.doctor.experienceYears ?? 0) || a.doctor.name.localeCompare(b.doctor.name));

  const conditionsByCategory = new Map<string, Disease[]>();
  for (const disease of conditions) conditionsByCategory.set(disease.categoryCode, [...(conditionsByCategory.get(disease.categoryCode) ?? []), disease]);

  const facilityLabel = (code: string) => t(HOSPITAL_COPY.facilities[code], locale) || FACILITIES.find((item) => item.value === code)?.label || code;
  const serviceGroups: ServiceGroup[] = [
    ...FACILITY_GROUPS.map((key) => ({
      key,
      label: t(HOSPITAL_COPY.facilityGroups[key], locale),
      items: (hospital.facilities ?? []).filter((code) => FACILITIES.find((item) => item.value === code)?.group === key).map(facilityLabel),
    })),
    {
      key: "language",
      label: t(HOSPITAL_COPY.facilityGroups.language, locale),
      items: [
        ...(hospital.languages ?? []).map((code) => t(HOSPITAL_COPY.languageNames[code], locale) || code),
        ...((hospital.facilities ?? []).includes("interpreter") ? [facilityLabel("interpreter")] : []),
      ],
    },
    {
      key: "clinical",
      label: t(HOSPITAL_COPY.facilityGroups.clinical, locale),
      items: (hospital.capabilities ?? []).map((code) => t(capabilities.get(code), locale) || code.replace(/-/g, " ")),
    },
  ].filter((item) => item.items.length > 0);

  const media = hospital.media;
  const place = [hospital.address, hospital.city, hospital.state, hospital.pincode, hospital.country].filter(Boolean).join(", ");
  const mapQuery =
    hospital.lat != null && hospital.lng != null
      ? `${hospital.lat},${hospital.lng}`
      : place.toLowerCase().includes(hospital.name.toLowerCase())
        ? place
        : `${hospital.name}, ${place}`;
  const airport = hospital.nearestAirport
    ? `${hospital.nearestAirport}${hospital.nearestAirportIata ? ` (${hospital.nearestAirportIata})` : ""}`
    : hospital.nearestAirportIata;
  const centreList = hospital.centres?.length
    ? hospital.centres.map((centre) => centre.name)
    : [...coe].map(specialtyName);
  const bookingSpecialties = [...new Set((hospital.specialtyCodes ?? []).map(specialtyName))].sort((a, b) => a.localeCompare(b));
  const whatsapp = content.contact.whatsapp;

  const faqs = [
    place
      ? { q: t(P.faqWhere(name), locale), a: [place + ".", airport ? t(P.faqAirport(airport, hospital.airportDistanceKm ?? null), locale) : ""].join(" ") }
      : null,
    accreditations.length
      ? { q: t(P.faqAccredited(name), locale), a: accreditations.map((item) => (item.body ? `${item.name} (${item.body})` : item.name)).join(", ") + "." }
      : null,
    hospital.beds || hospital.campusAcres || hospital.doctorCount
      ? { q: t(P.faqBeds(name), locale), a: t(P.faqBedsAnswer(hospital.beds ?? null, hospital.campusAcres ?? null, hospital.doctorCount ?? null), locale) }
      : null,
    centreList.length ? { q: t(P.faqStrengths(name), locale), a: t(P.faqStrengthsAnswer(centreList.join(", ")), locale) } : null,
    { q: t(P.faqBook(name), locale), a: t(P.faqBookAnswer, locale) },
    { q: t(P.faqDirect, locale), a: t(P.faqDirectAnswer, locale) },
  ].filter((item): item is { q: string; a: string } => item !== null);

  // The snapshot grid: only what is known, each linking to its section where there is one.
  type FactRow = { icon: string; label: string; value: React.ReactNode };
  const facts = ([
    {
      icon: "users",
      label: t(P.doctorsOnShifain, locale),
      value: (
        <a href="#doctors" className="text-brand hover:underline">
          {doctors.length ? `${doctors.length} · ` : ""}
          {t(P.viewList, locale)}
        </a>
      ),
    },
    {
      icon: "pin",
      label: t(P.location, locale),
      value: (
        <a href="#location" className="hover:text-brand hover:underline">
          {[hospital.city, hospital.country].filter(Boolean).join(", ")}
        </a>
      ),
    },
    hospital.yearEstablished ? { icon: "calendar", label: t(P.established, locale), value: hospital.yearEstablished } : null,
    accreditations.length
      ? {
          icon: "shield",
          label: t(P.accreditations, locale),
          value: (
            <ul className="mt-1 flex flex-wrap gap-2">
              {accreditations.map((item) => (
                <li
                  key={item.key}
                  title={[item.body, item.validTo ? `${t(HOSPITAL_COPY.accreditationValid, locale)} ${item.validTo}` : null].filter(Boolean).join(" · ") || undefined}
                  className="inline-flex items-center gap-1 rounded-lg bg-saffron-tint px-2.5 py-1 text-xs font-black tracking-wide text-saffron ring-1 ring-saffron/30"
                >
                  {item.name}
                </li>
              ))}
            </ul>
          ),
        }
      : null,
    hospital.hospitalType
      ? { icon: "hospital", label: t(P.type, locale), value: t(HOSPITAL_COPY.types[hospital.hospitalType], locale) || hospital.hospitalType }
      : null,
    hospital.beds ? { icon: "bed", label: t(P.beds, locale), value: hospital.beds.toLocaleString("en-US") } : null,
    hospital.specialtyCodes?.length
      ? {
          icon: "stethoscope",
          label: t(P.specialties, locale),
          value: (
            <a href="#specialties" className="text-brand hover:underline">
              {hospital.specialtyCodes.length} · {t(P.viewAll, locale)}
            </a>
          ),
        }
      : null,
    serviceGroups.length
      ? {
          icon: "check",
          label: t(P.facilities, locale),
          value: (
            <a href="#services" className="text-brand hover:underline">
              {t(P.viewAll, locale)}
            </a>
          ),
        }
      : null,
    media?.galleryIds.length
      ? {
          icon: "image",
          label: t(P.images, locale),
          value: (
            <a href="#gallery" className="text-brand hover:underline">
              {media.galleryIds.length} · {t(P.viewAll, locale)}
            </a>
          ),
        }
      : null,
  ] as (FactRow | null)[]).filter((fact): fact is FactRow => fact !== null);

  const doctorCard = ({ doctor, link }: { doctor: Doctor; link: { designation?: string | null } }) => {
    const codes = doctorSpecialtyCodes(doctor);
    return (
      <li key={doctor._id} className="flex flex-col rounded-2xl bg-white p-4 ring-1 ring-line sm:p-5">
        <div className="flex gap-4">
          {doctor.photoId ? (
            // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
            <img src={mediaUrl(doctor.photoId)} alt="" className="h-24 w-20 flex-none rounded-xl object-cover" />
          ) : (
            <span className="flex h-24 w-20 flex-none items-center justify-center rounded-xl bg-violet-soft text-2xl font-extrabold text-violet" aria-hidden="true">
              {initials(doctor.name)}
            </span>
          )}
          <div className="min-w-0">
            <Link href={`/${locale}/doctors/${doctor._id}`} className="text-lg font-extrabold leading-snug text-ink hover:text-brand">
              {doctor.name}
            </Link>
            {link.designation ?? doctor.designation ? <p className="mt-0.5 text-sm text-ink-soft">{link.designation ?? doctor.designation}</p> : null}
            {codes.length ? <p className="mt-1 text-sm font-semibold text-brand">{codes.map(specialtyName).join(", ")}</p> : null}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
              <Icon name="hospital" className="h-4 w-4 flex-none" />
              {name}
            </p>
            {doctor.experienceYears ? <p className="mt-1 text-sm font-bold text-ink">{t(P.experience(doctor.experienceYears), locale)}</p> : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 pt-1 sm:mt-auto sm:pt-4">
          <Link href={`/${locale}/doctors/${doctor._id}#book`} className="btn btn-primary !px-3 !py-2.5 text-sm">
            {t(BOOKING_COPY.book, locale)}
          </Link>
          <Link href={`/${locale}/doctors/${doctor._id}`} className="btn btn-secondary !px-3 !py-2.5 text-sm">
            {t(HOSPITAL_COPY.viewProfile, locale)}
          </Link>
        </div>
      </li>
    );
  };

  return (
    <>
      <Header content={content} locale={locale} path={`/hospitals/${id}`} />

      <main className="bg-surface-muted pb-14">
        <nav aria-label="Breadcrumb" className="border-b border-line bg-white">
          <ol className="ui-container flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-sm text-ink-soft">
            {[
              [t(P.home, locale), `/${locale}`],
              [t(P.hospitals, locale), `/${locale}/hospitals`],
              [hospital.country, `/${locale}/hospitals?country=${encodeURIComponent(hospital.country)}`],
              [hospital.city, `/${locale}/hospitals?city=${encodeURIComponent(hospital.city)}`],
            ].map(([label, href]) => (
              <li key={href} className="flex items-center gap-2">
                <Link href={href} className="hover:text-brand hover:underline">
                  {label}
                </Link>
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
              </li>
            ))}
            <li aria-current="page" className="font-semibold text-ink">
              {name}
            </li>
          </ol>
        </nav>

        <div className="ui-container mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="min-w-0 space-y-6">
            {/* Snapshot */}
            <header id="overview" className="card scroll-mt-24 p-5 sm:p-8">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1 text-sm font-bold text-violet">
                <Icon name="shield" className="h-4 w-4" />
                {t(P.partner, locale)}
              </p>
              <h1 className="mt-3 text-[clamp(1.8rem,1.3rem+1.8vw,2.7rem)] font-extrabold leading-tight tracking-tight text-ink">{name}</h1>
              <p className="mt-2 flex items-start gap-1.5 text-ink-soft">
                <Icon name="pin" className="mt-0.5 h-5 w-5 flex-none" />
                {[hospital.city, hospital.state, hospital.country].filter(Boolean).join(", ")}
              </p>
              {hospital.legalName || group || hospital.ownership ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {[
                    hospital.ownership ? t(HOSPITAL_COPY.ownership[hospital.ownership], locale) || hospital.ownership : null,
                    hospital.legalName ? `${t(HOSPITAL_COPY.operatedBy, locale)}: ${hospital.legalName}` : null,
                    group ? `${t(HOSPITAL_COPY.partOf, locale)}: ${group}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                {media?.coverId ? (
                  // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
                  <img src={mediaUrl(media.coverId)} alt={name} className="aspect-[4/3] w-full rounded-2xl object-cover md:aspect-auto md:h-full" />
                ) : (
                  <div className="relative flex min-h-60 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-violet via-brand to-brand-deep p-5 text-white sm:p-6 md:h-full md:min-h-72">
                    <Icon name="hospital" className="absolute -right-6 -top-6 h-48 w-48 text-white/10" />
                    {media?.logoId ? (
                      // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
                      <img src={mediaUrl(media.logoId)} alt="" className="mb-auto h-14 w-14 rounded-xl bg-white object-contain p-1" />
                    ) : (
                      <span className="mb-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-xl font-black" aria-hidden="true">
                        {initials(hospital.name)}
                      </span>
                    )}
                    {centreList.length ? (
                      <div className="mb-5 mt-6">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{t(HOSPITAL_COPY.centres, locale)}</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {centreList.slice(0, 5).map((centre) => (
                            <li key={centre} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                              {centre.replace(new RegExp(`^${hospital.name.split(" ")[0]}\\s+`, "i"), "")}
                            </li>
                          ))}
                          {centreList.length > 5 ? (
                            <li>
                              <a href="#specialties" className="inline-block rounded-full bg-white px-2.5 py-1 text-xs font-bold text-violet">
                                +{centreList.length - 5}
                              </a>
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}
                    <p className="text-2xl font-extrabold leading-tight">{hospital.name}</p>
                    <p className="mt-1 text-sm text-white/85">
                      {[
                        hospital.yearEstablished ? `${t(HOSPITAL_COPY.established, locale)} ${hospital.yearEstablished}` : null,
                        hospital.campusAcres ? t(P.campus(hospital.campusAcres), locale) : null,
                        hospital.city,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line">
                  {facts.map((fact, index) => (
                    <div key={fact.label} className={`bg-white ${index === facts.length - 1 && facts.length % 2 === 1 ? "col-span-2" : ""}`}>
                      <Fact icon={fact.icon} label={fact.label}>
                        {fact.value}
                      </Fact>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#book" className="btn btn-primary flex-1 sm:flex-none">
                  {t(BOOKING_COPY.book, locale)}
                </a>
                {whatsapp ? (
                  <a
                    href={waHref(whatsapp, `${t(BOOKING_COPY.whatsappText, locale)} ${name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn flex-1 bg-leaf text-white hover:bg-leaf/90 sm:flex-none"
                  >
                    <Icon name="chat" className="h-5 w-5" />
                    {t(BOOKING_COPY.whatsapp, locale)}
                  </a>
                ) : null}
              </div>
            </header>

            <nav aria-label="On this page" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <ul className="flex gap-2 text-sm font-semibold sm:flex-wrap">
                {[
                  ["about", t(HOSPITAL_COPY.about, locale), Boolean(about || hospital.usps?.length || hospital.awards?.length)],
                  ["doctors", t(HOSPITAL_COPY.doctors, locale), doctors.length > 0],
                  ["specialties", t(P.specialties, locale), Boolean(hospital.specialtyCodes?.length)],
                  ["conditions", t(HOSPITAL_COPY.conditions, locale), conditions.length > 0],
                  ["packages", t(HOSPITAL_COPY.packages, locale), packages.length > 0],
                  ["services", t(P.facilities, locale), serviceGroups.length > 0],
                  ["location", t(P.location, locale), true],
                  ["faq", t(P.faq, locale), true],
                ]
                  .filter(([, , shown]) => shown)
                  .map(([anchor, label]) => (
                    <li key={anchor as string} className="flex-none">
                      <a href={`#${anchor}`} className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-ink-soft ring-1 ring-line hover:text-brand">
                        {label}
                      </a>
                    </li>
                  ))}
              </ul>
            </nav>

            {about || hospital.usps?.length || hospital.awards?.length ? (
              <Section id="about" title={t(P.about(name), locale)}>
                {about ? (
                  <div className="max-w-3xl space-y-3 leading-relaxed text-ink-soft">
                    {about.split(/\n{2,}/).map((paragraph) => (
                      <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                {hospital.usps?.length ? (
                  <>
                    <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(P.highlights, locale)}</h3>
                    <ul className="mt-3 space-y-3">
                      {hospital.usps.map((line) => (
                        <li key={line} className="flex gap-3 leading-relaxed text-ink">
                          <Icon name="check" className="mt-0.5 h-5 w-5 flex-none text-leaf" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {hospital.awards?.length ? (
                  <>
                    <h3 className="mt-7 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(P.awards, locale)}</h3>
                    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[...hospital.awards]
                        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
                        .map((award) => (
                          <li key={`${award.year}-${award.title}`} className="flex gap-3 rounded-xl bg-saffron-tint/60 p-4">
                            <Icon name="award" className="h-6 w-6 flex-none text-saffron" />
                            <div className="min-w-0">
                              <p className="font-bold leading-snug text-ink">{award.title}</p>
                              <p className="mt-0.5 text-sm text-ink-soft">{[award.awardingBody, award.year].filter(Boolean).join(" · ")}</p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </>
                ) : null}
              </Section>
            ) : null}

            {doctors.length ? (
              <Section id="doctors" title={t(P.bySpecialty(name), locale)}>
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {doctorTiles.map(({ category, count }) => (
                    <li key={category}>
                      <Link
                        href={`/${locale}/doctors?hospital=${id}&category=${category}`}
                        className="link-card flex h-full items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line"
                      >
                        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-violet-soft text-violet">
                          <Icon name={CATEGORY_ICON[category] ?? "stethoscope"} className="h-6 w-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold leading-snug text-ink [overflow-wrap:anywhere]">{categoryName(category)}</span>
                          <span className="mt-0.5 block text-sm font-bold text-brand">{t(P.doctorsCount(count), locale)}</span>
                        </span>
                        <span aria-hidden="true" className="flex-none text-xl text-ink-muted">
                          ›
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-8 text-lg font-extrabold text-ink">{t(P.doctorsAt(name), locale)}</h3>
                <ul className="mt-4 grid gap-4 md:grid-cols-2">{ranked.slice(0, DOCTORS_SHOWN).map(doctorCard)}</ul>
                {ranked.length > DOCTORS_SHOWN ? (
                  <div className="mt-5 text-center">
                    <Link href={`/${locale}/doctors?hospital=${id}`} className="btn btn-secondary">
                      {t(P.seeAll(ranked.length), locale)}
                    </Link>
                  </div>
                ) : null}
              </Section>
            ) : null}

            {hospital.specialtyCodes?.length ? (
              <Section id="specialties" title={t(P.departments(name), locale)}>
                {hospital.centres?.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {hospital.centres.map((centre) => (
                      <li key={centre.id} className="rounded-2xl bg-violet-soft/60 p-4">
                        <p className="flex items-center gap-2 font-bold text-ink">
                          <Icon name="spark" className="h-5 w-5 flex-none text-violet" />
                          {centre.name}
                        </p>
                        {centre.description ? <p className="mt-1 text-sm text-ink-soft">{centre.description}</p> : null}
                        {centre.specialtyCodes.length ? <p className="mt-1 text-sm text-ink-soft">{centre.specialtyCodes.map(specialtyName).join(" · ")}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <h3 className={`${hospital.centres?.length ? "mt-7" : ""} text-sm font-bold uppercase tracking-[0.14em] text-ink-soft`}>
                  {t(P.allDepartments, locale)}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {[...hospital.specialtyCodes]
                    .sort((a, b) => Number(coe.has(b)) - Number(coe.has(a)) || specialtyName(a).localeCompare(specialtyName(b)))
                    .map((code) => (
                      <li
                        key={code}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${coe.has(code) ? "bg-violet-soft text-violet" : "bg-surface-muted text-ink ring-1 ring-line"}`}
                      >
                        {coe.has(code) ? (
                          <>
                            <Icon name="spark" className="h-4 w-4" />
                            <span className="sr-only">{t(HOSPITAL_COPY.coe, locale)}: </span>
                          </>
                        ) : null}
                        {specialtyName(code)}
                      </li>
                    ))}
                </ul>
                {coe.size ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Icon name="spark" className="h-4 w-4 text-violet" /> {t(HOSPITAL_COPY.coe, locale)}
                  </p>
                ) : null}
              </Section>
            ) : null}

            {conditions.length ? (
              <Section id="conditions" title={t(P.conditionsAt(name), locale)}>
                <p className="-mt-1 mb-5 max-w-3xl text-sm text-ink-soft">{t(HOSPITAL_COPY.conditionsBody, locale)}</p>
                <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
                  {[...conditionsByCategory.entries()].map(([category, items]) => (
                    <div key={category}>
                      <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
                        <Icon name={CATEGORY_ICON[category] ?? "stethoscope"} className="h-5 w-5 text-violet" />
                        {categoryName(category)}
                      </h3>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {items.map((disease) => (
                          <li key={disease._id}>
                            <Link
                              href={`/${locale}/conditions/${disease._id}`}
                              className="inline-flex min-h-9 items-center rounded-full bg-surface-muted px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:text-brand hover:ring-brand"
                            >
                              {t(disease.name, locale)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            {packages.length ? (
              <Section id="packages" title={t(HOSPITAL_COPY.packages, locale)}>
                <ul className="space-y-3">
                  {packages.map((item) => (
                    <li key={item._id} className="rounded-2xl bg-surface-muted p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-bold text-ink">{item.name}</p>
                        {item.priceMin != null || item.priceMax != null ? (
                          <p className="font-extrabold text-ink">
                            {[item.priceMin, item.priceMax].filter((value): value is number => value != null).map((value) => money(value, item.currency)).join(" – ")}
                          </p>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        {specialtyName(item.specialtyCode)}
                        {item.stayDays ? ` · ${item.stayDays} ${t(HOSPITAL_COPY.stayDays, locale)}` : ""}
                        {item.roomCategory ? ` · ${item.roomCategory}` : ""}
                      </p>
                      {item.inclusions || item.exclusions ? (
                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                          {item.inclusions ? (
                            <div>
                              <p className="font-semibold text-ink">{t(HOSPITAL_COPY.included, locale)}</p>
                              <p className="whitespace-pre-line text-ink-soft">{item.inclusions}</p>
                            </div>
                          ) : null}
                          {item.exclusions ? (
                            <div>
                              <p className="font-semibold text-ink">{t(HOSPITAL_COPY.notIncluded, locale)}</p>
                              <p className="whitespace-pre-line text-ink-soft">{item.exclusions}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-ink-muted">{t(HOSPITAL_COPY.priceRange, locale)}</p>
              </Section>
            ) : null}

            {serviceGroups.length ? (
              <Section id="services" title={t(P.servicesAt(name), locale)}>
                <ServiceTabs groups={serviceGroups} />
              </Section>
            ) : null}

            {media?.galleryIds.length || media?.virtualTourUrl || media?.videoUrl ? (
              <Section id="gallery" title={t(HOSPITAL_COPY.gallery, locale)}>
                {media.galleryIds.length ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {media.galleryIds.map((fileId) => (
                      <li key={fileId}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route */}
                        <img src={mediaUrl(fileId)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                  {media.virtualTourUrl ? (
                    <a href={media.virtualTourUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                      {t(HOSPITAL_COPY.tour, locale)}
                    </a>
                  ) : null}
                  {media.videoUrl ? (
                    <a href={media.videoUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                      {t(HOSPITAL_COPY.video, locale)}
                    </a>
                  ) : null}
                </p>
              </Section>
            ) : null}

            <Section id="location" title={t(P.locationAt(name), locale)}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <dl className="space-y-4 text-sm">
                  {place ? (
                    <div className="flex gap-3">
                      <Icon name="pin" className="h-5 w-5 flex-none text-violet" />
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(P.address, locale)}</dt>
                        <dd className="mt-0.5 leading-relaxed text-ink">{place}</dd>
                      </div>
                    </div>
                  ) : null}
                  {airport ? (
                    <div className="flex gap-3">
                      <Icon name="plane" className="h-5 w-5 flex-none text-violet" />
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.airport, locale)}</dt>
                        <dd className="mt-0.5 text-ink">
                          {airport}
                          {hospital.airportDistanceKm ? ` · ${hospital.airportDistanceKm} ${t(HOSPITAL_COPY.km, locale)}` : ""}
                        </dd>
                      </div>
                    </div>
                  ) : null}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
                  >
                    <Icon name="route" className="h-4 w-4" />
                    {t(HOSPITAL_COPY.map, locale)}
                  </a>
                </dl>
                <iframe
                  title={t(P.mapTitle(name), locale)}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-64 w-full rounded-2xl border-0 ring-1 ring-line md:h-full md:min-h-64"
                />
              </div>
            </Section>

            <Section id="faq" title={t(P.faq, locale)}>
              <div className="divide-y divide-line">
                {faqs.map((item) => (
                  <details key={item.q} className="group py-1">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 font-bold text-ink hover:text-brand [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <span aria-hidden="true" className="flex-none text-xl leading-none text-violet transition group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="pb-4 leading-relaxed text-ink-soft">{item.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          </div>

          <aside className="sticky-tall min-w-0 space-y-5 lg:self-start">
            <BookingPanel locale={locale} from={path} hospitalId={id} specialties={bookingSpecialties} subject={name} />

            <section aria-labelledby="why-title" className="card p-5">
              <h2 id="why-title" className="font-extrabold text-ink">
                {t(BOOKING_COPY.why, locale)}
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                {BOOKING_COPY.whyPoints.map((point) => (
                  <li key={point.en} className="flex gap-2.5 text-ink-soft">
                    <Icon name="check" className="mt-0.5 h-4 w-4 flex-none text-leaf" />
                    {t(point, locale)}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
