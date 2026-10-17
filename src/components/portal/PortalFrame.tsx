import Link from "next/link";
import { Suspense } from "react";
import { Header } from "../Header";
import { Footer } from "../Footer";
import { PortalNav } from "./PortalNav";
import { PortalIcon } from "./PortalIcon";
import { patientLogoutAction } from "@/app/(site)/[locale]/portal/patient/actions";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { ACCOUNT_COPY, PORTAL_COPY, PORTAL_NAV, type PortalSection } from "@/lib/portal-patient-copy";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";
import type { PortalData } from "@/lib/patient-portal";

const STATUS_TONE: Record<string, string> = {
  new: "bg-violet-soft text-violet",
  planning: "bg-violet-soft text-violet",
  planned: "bg-leaf-tint text-leaf",
  "plan-failed": "bg-saffron-tint text-[#a35a06]",
  confirmed: "bg-leaf-tint text-leaf",
  closed: "bg-surface-muted text-ink-soft",
};

export function StatusPill({ status, locale }: { status: string; locale: Locale }) {
  const label = PATIENT_COPY.statuses[status as keyof typeof PATIENT_COPY.statuses];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${STATUS_TONE[status] ?? STATUS_TONE.new}`}>
      {t(label, locale)}
    </span>
  );
}

/** A section's heading and lead line. */
export function PortalHeading({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.02em] text-navy">{title}</h1>
        {lead ? <p className="mt-2 text-base leading-relaxed text-[#2c3a5e] sm:text-lg">{lead}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** A white panel; the portal's one surface. */
export function Panel({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={`rounded-3xl p-5 sm:p-7 ${dark ? "bg-navy text-white" : "bg-white ring-1 ring-[#e6e3f4]"} ${className}`}>{children}</section>
  );
}

export function Notice({ tone, children }: { tone: "good" | "bad"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium ${
        tone === "good" ? "bg-leaf-tint text-[#1f6b31]" : "bg-saffron-tint text-[#8a4a05]"
      }`}
    >
      <PortalIcon name={tone === "good" ? "check" : "alert"} className="mt-0.5 h-5 w-5 flex-none" />
      <span>{children}</span>
    </p>
  );
}

const SECTIONS = Object.keys(PORTAL_NAV) as PortalSection[];

/** Header, the patient's card and the section list around one portal page. */
export function PortalFrame({
  content,
  locale,
  data,
  section,
  children,
}: {
  content: SiteContent;
  locale: Locale;
  data: PortalData;
  /** "new" is the start-a-case page, which is not in the section list. */
  section: PortalSection | "new";
  children: React.ReactNode;
}) {
  const { active, cases, account } = data;
  const accountName = account ? [account.firstName, account.lastName].filter(Boolean).join(" ") : "";
  const name = accountName || (active?.patient.name && active.patient.name !== "Website patient" ? active.patient.name : "");
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";
  const path = section === "overview" ? "/portal/patient" : `/portal/patient/${section}`;
  const newCase = `/${locale}/portal/patient/new`;

  return (
    <>
      <Header content={content} locale={locale} path={path} account={t(PORTAL_COPY.portalName, locale)} />
      <main className="bg-hero">
        <div className="mx-auto grid max-w-[100rem] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10 lg:px-12 lg:pt-10">
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-violet text-lg font-bold text-white"
                aria-hidden="true"
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-navy">{name || t(PORTAL_COPY.portalName, locale)}</p>
                {active ? (
                  <p className="truncate text-sm text-slate">
                    {t(PORTAL_COPY.caseLabel, locale)} …{active._id.slice(-4)}
                  </p>
                ) : null}
              </div>
            </div>

            {cases.length > 1 && active ? (
              <form className="flex items-center gap-2" action={`/${locale}${path}`}>
                <label className="sr-only" htmlFor="portal-case">
                  {t(PORTAL_COPY.switchCase, locale)}
                </label>
                <select
                  id="portal-case"
                  name="case"
                  defaultValue={active._id}
                  className="min-h-11 w-full rounded-xl border border-[#dcd8ee] bg-white px-3 text-sm text-navy"
                >
                  {cases.map((item) => (
                    <option key={item._id} value={item._id}>
                      {(item.statedNeed || t(PORTAL_COPY.caseLabel, locale)).slice(0, 40)} · …{item._id.slice(-4)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="min-h-11 rounded-xl bg-white px-3 text-sm font-semibold text-violet ring-1 ring-[#dcd8ee] hover:bg-violet-soft">
                  {t(PORTAL_COPY.switchCase, locale)}
                </button>
              </form>
            ) : null}

            <Suspense fallback={null}>
              <PortalNav
                locale={locale}
                label={t(PORTAL_COPY.portalName, locale)}
                items={SECTIONS.map((key) => ({ section: key, label: t(PORTAL_NAV[key], locale) }))}
              />
            </Suspense>

            {active ? (
              <Link
                href={newCase}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-[15px] font-semibold text-violet ring-1 ring-violet-line transition hover:bg-violet-soft"
              >
                <span aria-hidden="true" className="text-lg leading-none">+</span>
                {t(ACCOUNT_COPY.newCase, locale)}
              </Link>
            ) : null}

            <form action={patientLogoutAction} className="hidden lg:block">
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-[15px] font-medium text-slate transition hover:bg-white/80 hover:text-navy"
              >
                <PortalIcon name="logout" />
                {t(PORTAL_COPY.signOut, locale)}
              </button>
            </form>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
            {active || section === "help" || section === "translator" || section === "new" || (section === "profile" && account) ? (
              children
            ) : (
              <NoCaseYet locale={locale} firstName={account?.firstName || name.split(" ")[0] || ""} />
            )}
          </div>
        </div>
      </main>
      <Footer content={content} locale={locale} />
    </>
  );
}

/** What a signed-in patient with no case sees: a welcome, and one way to start. */
function NoCaseYet({ locale, firstName }: { locale: Locale; firstName: string }) {
  const base = `/${locale}/portal/patient`;
  return (
    <>
      <PortalHeading title={`${t(ACCOUNT_COPY.welcome, locale)}${firstName ? `, ${firstName}` : ""}`} lead={t(ACCOUNT_COPY.ready, locale)} />
      <Panel>
        <p className="max-w-xl text-lg leading-relaxed text-navy">{t(ACCOUNT_COPY.noCaseYet, locale)}</p>
        <Link
          href={`${base}/new`}
          className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-violet px-6 font-semibold text-white hover:bg-brand-deep"
        >
          {t(ACCOUNT_COPY.startCase, locale)}
          <PortalIcon name="arrow" />
        </Link>
        <p className="mt-6 text-[15px] text-slate">{t(ACCOUNT_COPY.meanwhile, locale)}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {(["translator", "help", "profile"] as const).map((item) => (
            <li key={item}>
              <Link
                href={`${base}/${item}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-muted px-4 text-[15px] font-semibold text-navy transition hover:bg-violet-soft hover:text-violet"
              >
                {t(PORTAL_NAV[item], locale)}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
