import { OpenChatButton } from "@/components/OpenChatButton";
import { Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;

export default async function PortalHelp(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const subject = data.active ? `?subject=${encodeURIComponent(`Case ${data.active._id}`)}` : "";

  return (
    <PortalFrame content={content} locale={locale} data={data} section="help">
      <PortalHeading title={t(PORTAL_COPY.helpTitle, locale)} lead={t(PORTAL_COPY.helpLead, locale)} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel className="!p-2 sm:!p-3">
          {PORTAL_COPY.faqs.map((item) => (
            <details key={item.q.en} className="group rounded-2xl px-4 py-1 open:bg-surface-muted sm:px-5">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-navy [&::-webkit-details-marker]:hidden">
                {t(item.q, locale)}
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-violet-soft text-violet transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="pb-4 text-[15px] leading-relaxed text-[#2c3a5e]">{t(item.a, locale)}</p>
            </details>
          ))}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.talkToPerson, locale)}</h2>
            <p className="text-[15px] leading-relaxed text-[#2c3a5e]">{t(PORTAL_COPY.coordinatorBody, locale)}</p>
            <OpenChatButton className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep">
              <PortalIcon name="chat" />
              {t(PORTAL_COPY.chatNow, locale)}
            </OpenChatButton>
            <a href={waHref(content.contact.whatsapp)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-leaf-tint px-6 font-semibold text-[#1f6b31] hover:bg-[#d9f0df]">
              <PortalIcon name="whatsapp" />
              {t(PORTAL_COPY.whatsapp, locale)}
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a href={telHref(content.contact.phone)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface-muted font-semibold text-navy hover:bg-[#efeafd]">
                <PortalIcon name="phone" />
                {t(PORTAL_COPY.call, locale)}
              </a>
              <a href={`mailto:${content.contact.email}${subject}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface-muted font-semibold text-navy hover:bg-[#efeafd]">
                <PortalIcon name="mail" />
                {t(PORTAL_COPY.email, locale)}
              </a>
            </div>
          </Panel>

          <p role="note" className="flex gap-3 rounded-3xl bg-[#fdecec] p-5 text-[15px] font-medium leading-relaxed text-[#8f1d1d]">
            <PortalIcon name="alert" className="mt-0.5 h-5 w-5 flex-none" />
            {t(PORTAL_COPY.emergency, locale)}
          </p>
        </div>
      </div>
    </PortalFrame>
  );
}
