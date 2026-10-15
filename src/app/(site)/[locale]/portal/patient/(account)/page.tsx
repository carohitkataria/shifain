import Link from "next/link";
import { OpenChatButton } from "@/components/OpenChatButton";
import { Panel, PortalFrame, PortalHeading, StatusPill } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_COPY, PORTAL_NAV } from "@/lib/portal-patient-copy";
import { portalPage, withCase, type PortalPageProps } from "@/lib/patient-portal-page";
import { languageName } from "@/lib/patient-portal";
import { t } from "@/lib/localize";
import type { CaseStatus } from "@/lib/cases";

export const dynamic = "force-dynamic";

const STEPS = ["received", "plan", "review", "hospital", "travel", "treatment", "home"] as const;

/** How far along the journey the backend says the case is; -1 when closed. */
const CURRENT_STEP: Record<CaseStatus, number> = {
  new: 1,
  planning: 1,
  "plan-failed": 1,
  planned: 2,
  confirmed: 4,
  closed: -1,
};

const NEXT_HREF: Record<CaseStatus, string> = {
  new: "reports",
  planning: "reports",
  "plan-failed": "reports",
  planned: "plan",
  confirmed: "schedule",
  closed: "",
};

const FEATURES = ["plan", "reports", "schedule", "translator", "history", "help"] as const;

const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;

export default async function PortalOverview(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const record = data.active;
  const base = `/${locale}/portal/patient`;

  if (!record) {
    return <PortalFrame content={content} locale={locale} data={data} section="overview">{null}</PortalFrame>;
  }

  const first = record.patient.name && record.patient.name !== "Website patient" ? record.patient.name.split(" ")[0] : "";
  const current = CURRENT_STEP[record.status];
  const nextHref = NEXT_HREF[record.status] ? withCase(`${base}/${NEXT_HREF[record.status]}`, record._id) : `/${locale}#quote-form`;
  const upcoming = (record.appointments ?? [])
    .filter((item) => item.status === "requested" || item.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <PortalFrame content={content} locale={locale} data={data} section="overview">
      <PortalHeading title={`${t(PORTAL_COPY.hello, locale)}${first ? `, ${first}` : ""}`} lead={t(PORTAL_COPY.overviewLead, locale)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel dark className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-white/75">{t(PORTAL_COPY.statusNow, locale)}</p>
            <StatusPill status={record.status} locale={locale} />
          </div>
          <div>
            <p className="text-sm font-medium text-white/75">{t(PORTAL_COPY.nextStep, locale)}</p>
            <p className="mt-1 max-w-2xl text-xl font-semibold leading-snug text-white sm:text-2xl">{t(PORTAL_COPY.next[record.status], locale)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={nextHref}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-navy transition hover:bg-violet-soft"
            >
              {t(PORTAL_COPY.nextAction[record.status], locale)}
              <PortalIcon name="arrow" />
            </Link>
            <OpenChatButton className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10">
              <PortalIcon name="chat" />
              {t(PORTAL_COPY.chatNow, locale)}
            </OpenChatButton>
          </div>
          <p className="text-sm text-white/70">
            {t(PORTAL_COPY.caseLabel, locale)} {record._id} · {t(PORTAL_COPY.opened, locale)}{" "}
            {new Date(record.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.coordinator, locale)}</h2>
          <p className="text-[15px] leading-relaxed text-[#2c3a5e]">{t(PORTAL_COPY.coordinatorBody, locale)}</p>
          {upcoming ? (
            <Link href={withCase(`${base}/schedule`, record._id)} className="rounded-2xl bg-violet-soft p-4 text-navy hover:bg-[#ece2ff]">
              <span className="block text-sm font-semibold text-violet">{t(PORTAL_COPY.callStatus[upcoming.status], locale)}</span>
              <span className="mt-1 block font-semibold">
                {t(PORTAL_COPY.kinds[upcoming.kind], locale)} ·{" "}
                {upcoming.confirmedSlot ||
                  `${new Date(`${upcoming.date}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}, ${t(PORTAL_COPY.windows[upcoming.window], locale)}`}{" "}
                · {languageName(upcoming.language)}
              </span>
            </Link>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <a href={waHref(content.contact.whatsapp)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-leaf-tint text-sm font-semibold text-[#1f6b31] hover:bg-[#d9f0df]">
              <PortalIcon name="whatsapp" />
              {t(PORTAL_COPY.whatsapp, locale)}
            </a>
            <a href={telHref(content.contact.phone)} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-muted text-sm font-semibold text-navy hover:bg-[#efeafd]">
              <PortalIcon name="phone" />
              {t(PORTAL_COPY.call, locale)}
            </a>
            <a href={`mailto:${content.contact.email}?subject=${encodeURIComponent(`Case ${record._id}`)}`} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl bg-surface-muted text-sm font-semibold text-navy hover:bg-[#efeafd]">
              <PortalIcon name="mail" />
              {t(PORTAL_COPY.email, locale)}
            </a>
          </div>
        </Panel>
      </div>

      <Panel>
        <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.journey, locale)}</h2>
        {record.status === "closed" ? (
          <p className="mt-3 text-[15px] text-[#2c3a5e]">{t(PORTAL_COPY.next.closed, locale)}</p>
        ) : null}
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {STEPS.map((step, index) => {
            const state = current < 0 ? "later" : index < current ? "done" : index === current ? "now" : "later";
            return (
              <li
                key={step}
                aria-current={state === "now" ? "step" : undefined}
                className={`flex items-center gap-3 rounded-2xl p-3 2xl:flex-col 2xl:items-start ${
                  state === "now" ? "bg-violet text-white" : state === "done" ? "bg-leaf-tint text-[#1f6b31]" : "bg-surface-muted text-slate"
                }`}
              >
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold ${
                    state === "now" ? "bg-white text-violet" : state === "done" ? "bg-leaf text-white" : "bg-white text-slate"
                  }`}
                >
                  {state === "done" ? <PortalIcon name="check" className="h-4 w-4" /> : index + 1}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight">{t(PORTAL_COPY.steps[step], locale)}</span>
                  <span className="mt-0.5 block text-sm opacity-80">
                    {t(state === "done" ? PORTAL_COPY.stepDone : state === "now" ? PORTAL_COPY.stepNow : PORTAL_COPY.stepLater, locale)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <section aria-labelledby="portal-features">
        <h2 id="portal-features" className="text-lg font-bold text-navy">
          {t(PORTAL_COPY.quickLinks, locale)}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature}>
              <Link
                href={withCase(`${base}/${feature}`, record._id)}
                className="group flex h-full items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-[#e6e3f4] transition hover:ring-violet/40"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-violet-soft text-violet">
                  <PortalIcon name={feature} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-base font-bold text-navy">
                    {t(PORTAL_NAV[feature], locale)}
                    <PortalIcon name="arrow" className="h-4 w-4 text-violet transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-[15px] leading-snug text-[#2c3a5e]">{t(PORTAL_COPY.features[feature], locale)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PortalFrame>
  );
}
