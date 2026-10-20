import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { isDatabaseConfigured } from "@/lib/db";
import { listCategories, listSpecialties, type Disease } from "@/lib/catalogue";
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
import { accreditationBody } from "@/lib/onboarding-masters";
import { accreditationStatus, inForce } from "@/lib/onboarding-rules";
import { mediaUrl } from "@/lib/media";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-28 p-6 sm:p-8" aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined} className="text-xl font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** The facts row fills its width whether three facts are known or nine. */
const FACT_COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
};

const money = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "INR" ? "₹" : `${currency} `}${Math.round(value).toLocaleString("en-US")}`;

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
  const specialtyName = (code: string) => t(specialties.find((item) => item._id === code)?.name, locale) || code;
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

  const facts: [string | number, string][] = [
    [hospital.yearEstablished ?? "", t(HOSPITAL_COPY.established, locale)],
    [hospital.beds ?? "", t(HOSPITAL_COPY.beds, locale)],
    [hospital.icuBeds ?? "", t(HOSPITAL_COPY.icuBeds, locale)],
    [hospital.hduBeds ?? "", t(HOSPITAL_COPY.hduBeds, locale)],
    [hospital.otCount ?? "", t(HOSPITAL_COPY.theatres, locale)],
    [hospital.cathlabCount ?? "", t(HOSPITAL_COPY.cathLabs, locale)],
    [hospital.doctorCount ? `${hospital.doctorCount}+` : "", t(HOSPITAL_COPY.doctorCount, locale)],
    [hospital.nurseCount ?? "", t(HOSPITAL_COPY.nurseCount, locale)],
    [hospital.specialtyCodes?.length ?? "", t(HOSPITAL_COPY.specialtiesCount, locale)],
  ].filter(([value]) => value !== "" && value !== 0) as [string | number, string][];

  const byCategory = new Map<string, Disease[]>();
  for (const disease of conditions) byCategory.set(disease.categoryCode, [...(byCategory.get(disease.categoryCode) ?? []), disease]);
  const desk = hospital.internationalDesk;
  const media = hospital.media;
  const place = [hospital.address, hospital.city, hospital.state, hospital.pincode, hospital.country].filter(Boolean).join(", ");
  const map =
    hospital.lat != null && hospital.lng != null
      ? `https://www.google.com/maps?q=${hospital.lat},${hospital.lng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(`${hospital.name} ${place}`)}`;

  return (
    <>
      <Header content={content} locale={locale} path={`/hospitals/${id}`} />

      <main className="bg-surface-muted px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <Link href={`/${locale}/hospitals`} className="text-sm font-bold text-brand hover:underline">
            &larr; {t(HOSPITAL_COPY.back, locale)}
          </Link>

          {/* Snapshot */}
          <header className="card mt-4 overflow-hidden">
            {media?.coverId ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
              <img src={mediaUrl(media.coverId)} alt="" className="h-48 w-full object-cover sm:h-64" />
            ) : null}
            <div className="flex flex-wrap items-start gap-5 p-6 sm:p-8">
              {media?.logoId ? (
                // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
                <img src={mediaUrl(media.logoId)} alt={`${hospital.name} logo`} className="h-16 w-16 flex-none rounded-2xl bg-white object-contain ring-1 ring-line" />
              ) : null}
              <div className="min-w-0 flex-1 basis-72">
                <h1 className="text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)] font-extrabold leading-tight tracking-tight text-ink">{hospital.name}</h1>
                <p className="mt-1.5 text-ink-soft">
                  {[hospital.city, hospital.state, hospital.country].filter(Boolean).join(", ")}
                  {hospital.hospitalType ? ` · ${t(HOSPITAL_COPY.types[hospital.hospitalType], locale) || hospital.hospitalType}` : ""}
                  {hospital.ownership ? ` · ${t(HOSPITAL_COPY.ownership[hospital.ownership], locale) || hospital.ownership}` : ""}
                </p>
                {hospital.legalName || group ? (
                  <p className="mt-1 text-sm text-ink-muted">
                    {hospital.legalName ? `${t(HOSPITAL_COPY.operatedBy, locale)}: ${hospital.legalName}` : ""}
                    {hospital.legalName && group ? " · " : ""}
                    {group ? `${t(HOSPITAL_COPY.partOf, locale)}: ${group}` : ""}
                  </p>
                ) : null}
                {accreditations.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="Accreditations">
                    {accreditations.map((item) => (
                      <li key={item.key} className="rounded-xl bg-leaf/10 px-3 py-1.5 text-leaf" title={item.body ?? undefined}>
                        <span className="text-sm font-extrabold tracking-wide">{item.name}</span>
                        <span className="ml-1.5 text-xs font-medium">
                          {item.validTo ? `${t(HOSPITAL_COPY.accreditationValid, locale)} ${item.validTo}` : t(HOSPITAL_COPY.accreditationPending, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <Link href={`/${locale}#quote-form`} className="btn btn-primary shrink-0">
                {t(HOSPITAL_COPY.cta, locale)}
              </Link>
            </div>
            {facts.length ? (
              <dl className={`grid grid-cols-2 border-t border-line ${FACT_COLUMNS[Math.min(facts.length, 5)]}`}>
                {facts.map(([value, label]) => (
                  <div key={label} className="border-b border-r border-line px-5 py-4 last:border-r-0">
                    <dd className="text-2xl font-extrabold tabular-nums text-ink">{value}</dd>
                    <dt className="text-sm text-ink-soft">{label}</dt>
                  </div>
                ))}
              </dl>
            ) : null}
          </header>

          <nav aria-label="On this page" className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            {[
              ["about", t(HOSPITAL_COPY.about, locale)],
              ["specialties", t(HOSPITAL_COPY.specialties, locale)],
              ["conditions", t(HOSPITAL_COPY.conditions, locale)],
              ["doctors", t(HOSPITAL_COPY.doctors, locale)],
              ["services", t(HOSPITAL_COPY.services, locale)],
              ["location", t(HOSPITAL_COPY.location, locale)],
            ].map(([anchor, label]) => (
              <a key={anchor} href={`#${anchor}`} className="rounded-full bg-white px-4 py-2 text-ink-soft ring-1 ring-line hover:text-brand">
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-5">
              {about || hospital.usps?.length ? (
                <Section id="about" title={t(HOSPITAL_COPY.about, locale)}>
                  {about ? <p className="max-w-3xl leading-relaxed text-ink-soft">{about}</p> : null}
                  {hospital.usps?.length ? (
                    <>
                      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(HOSPITAL_COPY.apart, locale)}</h3>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {hospital.usps.map((line) => (
                          <li key={line} className="flex gap-2.5 text-ink">
                            <Icon name="check" className="mt-0.5 h-5 w-5 flex-none text-leaf" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </Section>
              ) : null}

              {hospital.specialtyCodes?.length ? (
                <Section id="specialties" title={t(HOSPITAL_COPY.specialties, locale)}>
                  {hospital.centres?.length ? (
                    <>
                      <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(HOSPITAL_COPY.centres, locale)}</h3>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                        {hospital.centres.map((centre) => (
                          <li key={centre.id} className="rounded-xl bg-violet-soft/60 p-4">
                            <p className="font-bold text-ink">{centre.name}</p>
                            {centre.description ? <p className="mt-1 text-sm text-ink-soft">{centre.description}</p> : null}
                            {centre.specialtyCodes.length ? (
                              <p className="mt-1 text-sm text-ink-soft">{centre.specialtyCodes.map(specialtyName).join(" · ")}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <ul className={`${hospital.centres?.length ? "mt-6" : ""} flex flex-wrap gap-2`}>
                    {hospital.specialtyCodes.map((code) => (
                      <li key={code} className={`chip ${coe.has(code) ? "!bg-violet-soft !text-violet" : ""}`}>
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
                </Section>
              ) : null}

              {conditions.length ? (
                <Section id="conditions" title={t(HOSPITAL_COPY.conditions, locale)}>
                  <p className="-mt-2 mb-4 text-sm text-ink-soft">{t(HOSPITAL_COPY.conditionsBody, locale)}</p>
                  <div className="space-y-4">
                    {[...byCategory.entries()].map(([category, items]) => (
                      <div key={category}>
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                          {t(categories.find((item) => item._id === category)?.name, locale) || category}
                        </h3>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {items.map((disease) => (
                            <li key={disease._id}>
                              <Link
                                href={`/${locale}/conditions/${disease._id}`}
                                className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:text-brand hover:ring-brand"
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

              <Section id="doctors" title={`${t(HOSPITAL_COPY.doctors, locale)}${doctors.length ? ` (${doctors.length})` : ""}`}>
                {doctors.length === 0 ? (
                  <p className="text-ink-soft">{t(HOSPITAL_COPY.noDoctors, locale)}</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {doctors.map(({ doctor, link }) => {
                      const codes = doctorSpecialtyCodes(doctor);
                      const sub = doctor.specialties?.[0]?.subSpecialty;
                      return (
                        <li key={doctor._id}>
                          <Link href={`/${locale}/doctors/${doctor._id}`} className="link-card flex h-full gap-3 rounded-xl bg-surface-muted p-4">
                            {doctor.photoId ? (
                              // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
                              <img src={mediaUrl(doctor.photoId)} alt="" className="h-12 w-12 flex-none rounded-full object-cover" />
                            ) : (
                              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-violet text-sm font-bold text-white" aria-hidden="true">
                                {doctor.name.replace(/^Dr\.?\s*/i, "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block font-bold text-ink">{doctor.name}</span>
                              <span className="block text-sm text-ink-soft">
                                {[link.designation ?? doctor.designation, codes.map(specialtyName).join(", ")].filter(Boolean).join(" · ")}
                              </span>
                              {sub || doctor.experienceYears ? (
                                <span className="block text-sm text-ink-muted">
                                  {[sub, doctor.experienceYears ? `${doctor.experienceYears}+ ${t(DOCTOR_LIST_COPY.experience, locale)}` : null].filter(Boolean).join(" · ")}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              {packages.length ? (
                <Section id="packages" title={t(HOSPITAL_COPY.packages, locale)}>
                  <ul className="space-y-3">
                    {packages.map((item) => (
                      <li key={item._id} className="rounded-xl bg-surface-muted p-4">
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

              {hospital.facilities?.length || hospital.capabilities?.length || hospital.languages?.length ? (
                <Section id="services" title={t(HOSPITAL_COPY.services, locale)}>
                  {hospital.facilities?.length ? (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {hospital.facilities.map((code) => (
                        <li key={code} className="flex gap-2.5 text-ink">
                          <Icon name="check" className="mt-0.5 h-5 w-5 flex-none text-leaf" />
                          {t(HOSPITAL_COPY.facilities[code], locale) || code}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {hospital.capabilities?.length ? (
                    <>
                      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(HOSPITAL_COPY.capabilities, locale)}</h3>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {hospital.capabilities.map((code) => (
                          <li key={code} className="chip">
                            {t(capabilities.get(code), locale) || code.replace(/-/g, " ")}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {hospital.languages?.length ? (
                    <p className="mt-6 text-ink-soft">
                      <span className="font-semibold text-ink">{t(HOSPITAL_COPY.languages, locale)}:</span>{" "}
                      {hospital.languages.map((code) => t(HOSPITAL_COPY.languageNames[code], locale) || code).join(", ")}
                    </p>
                  ) : null}
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
            </div>

            <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
              <Section id="location" title={t(HOSPITAL_COPY.location, locale)}>
                <dl className="space-y-3 text-sm">
                  {place ? (
                    <div>
                      <dt className="sr-only">Address</dt>
                      <dd className="leading-relaxed text-ink">{place}</dd>
                    </div>
                  ) : null}
                  {hospital.phone ? (
                    <div>
                      <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.phone, locale)}</dt>
                      <dd>
                        <a href={`tel:${hospital.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand hover:underline">
                          {hospital.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {hospital.nearestAirport || hospital.nearestAirportIata ? (
                    <div>
                      <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.airport, locale)}</dt>
                      <dd className="text-ink">
                        {hospital.nearestAirport ?? ""}
                        {hospital.nearestAirportIata ? ` (${hospital.nearestAirportIata})` : ""}
                        {hospital.airportDistanceKm ? ` · ${hospital.airportDistanceKm} ${t(HOSPITAL_COPY.km, locale)}` : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <a href={map} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
                  <Icon name="route" className="h-4 w-4" />
                  {t(HOSPITAL_COPY.map, locale)}
                </a>
              </Section>

              {desk?.exists || desk?.contactName || desk?.email || desk?.phone ? (
                <Section title={t(HOSPITAL_COPY.desk, locale)}>
                  <dl className="space-y-2 text-sm">
                    {desk.contactName ? (
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.contact, locale)}</dt>
                        <dd className="text-ink">{desk.contactName}</dd>
                      </div>
                    ) : null}
                    {desk.email ? (
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.email, locale)}</dt>
                        <dd>
                          <a href={`mailto:${desk.email}`} className="text-brand hover:underline">
                            {desk.email}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    {desk.phone ? (
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.phone, locale)}</dt>
                        <dd className="text-ink">{desk.phone}</dd>
                      </div>
                    ) : null}
                    {desk.languages?.length ? (
                      <div>
                        <dt className="font-semibold text-ink-soft">{t(HOSPITAL_COPY.deskLanguages, locale)}</dt>
                        <dd className="text-ink">{desk.languages.join(", ")}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Section>
              ) : null}

              {hospital.officialWebsite ? (
                <a
                  href={hospital.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card flex items-center justify-between gap-3 p-5 font-semibold text-brand hover:underline"
                >
                  {t(HOSPITAL_COPY.website, locale)}
                  <Icon name="route" className="h-4 w-4" />
                </a>
              ) : null}

              <Link href={`/${locale}#quote-form`} className="btn btn-primary w-full">
                {t(HOSPITAL_COPY.cta, locale)}
              </Link>
            </aside>
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
