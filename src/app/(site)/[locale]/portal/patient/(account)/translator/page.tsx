import Link from "next/link";
import { Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { Translator } from "@/components/portal/Translator";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, withCase, type PortalPageProps } from "@/lib/patient-portal-page";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

export default async function PortalTranslator(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const mine = PORTAL_LANGUAGES.some((item) => item.code === locale) ? locale : "en";
  const theirs = mine === "en" ? "hi" : "en";

  return (
    <PortalFrame content={content} locale={locale} data={data} section="translator">
      <PortalHeading title={t(PORTAL_COPY.translatorTitle, locale)} lead={t(PORTAL_COPY.translatorLead, locale)} />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <Translator
            languages={PORTAL_LANGUAGES}
            defaultMine={mine}
            defaultTheirs={theirs}
            labels={{
              iSpeak: t(PORTAL_COPY.iSpeak, locale),
              theySpeak: t(PORTAL_COPY.theySpeak, locale),
              me: t(PORTAL_COPY.me, locale),
              them: t(PORTAL_COPY.them, locale),
              typeHere: t(PORTAL_COPY.typeHere, locale),
              translate: t(PORTAL_COPY.translate, locale),
              listening: t(PORTAL_COPY.listening, locale),
              readAloud: t(PORTAL_COPY.readAloud, locale),
              swap: t(PORTAL_COPY.swap, locale),
              clear: t(PORTAL_COPY.clear, locale),
              translating: t(PORTAL_COPY.translating, locale),
              failed: t(PORTAL_COPY.translateFailed, locale),
              empty: t(PORTAL_COPY.translatorEmpty, locale),
              speak: t(PORTAL_COPY.speak, locale),
              play: t(PORTAL_COPY.play, locale),
            }}
          />
        </Panel>

        <Panel className="flex flex-col gap-3 self-start">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron-tint text-[#a35a06]">
            <PortalIcon name="alert" />
          </span>
          <p className="text-[15px] leading-relaxed text-navy">{t(PORTAL_COPY.translatorCaution, locale)}</p>
          {data.active ? (
            <Link
              href={withCase(`/${locale}/portal/patient/schedule`, data.active._id)}
              className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep"
            >
              {t(PORTAL_COPY.bookInterpreter, locale)}
              <PortalIcon name="arrow" />
            </Link>
          ) : null}
        </Panel>
      </div>
    </PortalFrame>
  );
}
