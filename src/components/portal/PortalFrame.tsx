import Link from "next/link";
import { PortalIcon } from "./PortalIcon";
import { AppShell, type Section } from "../patient-app/AppShell";
import { buildApp } from "@/lib/patient-app";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { ACCOUNT_COPY, PORTAL_NAV, type PortalSection } from "@/lib/portal-patient-copy";
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

const SECTION_OF: Record<PortalSection | "new", Section> = {
  overview: "home",
  plan: "plan",
  reports: "reports",
  schedule: "schedule",
  translator: "translate",
  history: "history",
  help: "help",
  profile: "settings",
  new: "new",
};

/**
 * The earlier portal pages (full plan, calls, history, help, a new case),
 * now inside the patient app's phone frame so every screen has the same bar,
 * bell, SOS and help button.
 */
export async function PortalFrame({
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
  const app = await buildApp(locale, content, data, {});
  const { active, account } = data;
  const name = account?.firstName || (active?.patient.name && active.patient.name !== "Website patient" ? active.patient.name : "");
  return (
    <AppShell app={app} section={SECTION_OF[section]}>
      <div className="a-legacy flex min-w-0 flex-col gap-5">
        {active || section === "help" || section === "translator" || section === "new" || (section === "profile" && account) ? (
          children
        ) : (
          <NoCaseYet locale={locale} firstName={name.split(" ")[0] || ""} />
        )}
      </div>
    </AppShell>
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
