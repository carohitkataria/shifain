import Link from "next/link";
import { Panel, PortalFrame, PortalHeading, StatusPill } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { ACCOUNT_COPY, PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { patientLogoutAction } from "../../actions";
import { LOCALE_META, isLocale } from "@/lib/i18n";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

export default async function PortalProfile(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const record = data.active;
  const account = data.account;
  if (!record && !account) return <PortalFrame content={content} locale={locale} data={data} section="profile">{null}</PortalFrame>;

  const signedIn = data.identity.kind === "email" ? data.identity.email : `…${data.identity.digits.slice(-4)}`;
  // The account holds what the patient told us about themselves; a case, what was sent with it.
  const name = account ? [account.firstName, account.lastName].filter(Boolean).join(" ") : record!.patient.name;
  const phone = account?.phone ? [account.dial, account.phone].filter(Boolean).join(" ") : record?.patient.phone;
  const language = account?.locale ?? record?.locale ?? locale;
  const rows: [string, string][] = [
    [t(PORTAL_COPY.name, locale), name || "—"],
    [t(PORTAL_COPY.phone, locale), phone || "—"],
    [t(PORTAL_COPY.emailAddress, locale), account?.email || record?.patient.email || "—"],
    [t(PORTAL_COPY.country, locale), account?.country || record?.patient.country || "—"],
    [t(PORTAL_COPY.caseLanguage, locale), isLocale(language) ? LOCALE_META[language].label : language],
    [t(PORTAL_COPY.signedInWith, locale), signedIn],
  ];

  return (
    <PortalFrame content={content} locale={locale} data={data} section="profile">
      <PortalHeading title={t(PORTAL_COPY.profileTitle, locale)} lead={t(PORTAL_COPY.profileLead, locale)} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <dl className="divide-y divide-[#eeebf7]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3.5 text-[15px]">
                <dt className="text-slate">{label}</dt>
                <dd className="break-all font-semibold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
          <form action={patientLogoutAction} className="mt-5">
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 font-semibold text-navy ring-1 ring-[#dcd8ee] transition hover:bg-surface-muted">
              <PortalIcon name="logout" />
              {t(PORTAL_COPY.signOut, locale)}
            </button>
          </form>
        </Panel>

        <Panel>
          <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.allCases, locale)}</h2>
          {data.cases.length === 0 ? (
            <p className="mt-3 text-[15px] leading-relaxed text-slate">{t(ACCOUNT_COPY.noCaseYet, locale)}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {data.cases.map((item) => (
                <li key={item._id}>
                  <Link
                    href={`/${locale}/portal/patient?case=${encodeURIComponent(item._id)}`}
                    aria-current={item._id === record?._id ? "true" : undefined}
                    className={`flex flex-wrap items-center gap-3 rounded-2xl p-4 transition ${
                      item._id === record?._id ? "bg-violet-soft ring-1 ring-violet/30" : "bg-surface-muted hover:bg-[#efeafd]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="block truncate font-semibold text-navy">{item.statedNeed || item._id}</span>
                      <span className="block text-sm text-slate">
                        …{item._id.slice(-4)} · {t(PORTAL_COPY.opened, locale)} {new Date(item.createdAt).toLocaleDateString(locale)}
                      </span>
                    </span>
                    <StatusPill status={item.status} locale={locale} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/${locale}/portal/patient/new`}
            className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-violet hover:underline"
          >
            {t(ACCOUNT_COPY.startCase, locale)}
            <PortalIcon name="arrow" className="h-4 w-4" />
          </Link>
        </Panel>
      </div>
    </PortalFrame>
  );
}
