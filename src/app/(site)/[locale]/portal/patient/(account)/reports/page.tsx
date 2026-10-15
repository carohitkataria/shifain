import { Notice, Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { listReports } from "@/lib/reports";
import { deleteReportsAction, uploadReportsAction } from "../../portal-actions";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

const size = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const kindOf = (mediaType: string) => (mediaType === "application/pdf" ? "PDF" : mediaType.startsWith("image/") ? mediaType.slice(6).toUpperCase() : "FILE");

export default async function PortalReports(props: PortalPageProps) {
  const { locale, content, data, query } = await portalPage(props);
  const record = data.active;
  if (!record) return <PortalFrame content={content} locale={locale} data={data} section="reports">{null}</PortalFrame>;

  const stored = await listReports(record._id).catch(() => []);
  const storedIds = new Set(stored.map((item) => item._id));
  const day = (value: string | Date) => new Date(value).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <PortalFrame content={content} locale={locale} data={data} section="reports">
      <PortalHeading title={t(PORTAL_COPY.reportsTitle, locale)} lead={t(PORTAL_COPY.reportsLead, locale)} />

      {query.done === "uploaded" ? <Notice tone="good">{t(PORTAL_COPY.uploaded, locale)}</Notice> : null}
      {query.done === "deleted" ? <Notice tone="good">{t(PORTAL_COPY.deleted, locale)}</Notice> : null}
      {query.error === "upload" ? <Notice tone="bad">{t(PORTAL_COPY.uploadFailed, locale)}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.uploadTitle, locale)}</h2>
          <form action={uploadReportsAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="case" value={record._id} />
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-violet-line bg-violet-soft/60 px-6 py-10 text-center transition hover:border-violet/60 focus-within:border-violet">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-violet">
                <PortalIcon name="upload" className="h-6 w-6" />
              </span>
              <span className="text-base font-semibold text-navy">{t(PORTAL_COPY.uploadTitle, locale)}</span>
              <span className="text-sm text-slate">{t(PORTAL_COPY.uploadHint, locale)}</span>
              <input
                type="file"
                name="files"
                multiple
                required
                accept="application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"
                className="mt-2 max-w-full text-sm text-navy file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-violet file:px-4 file:font-semibold file:text-white"
              />
            </label>
            <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-violet px-7 font-semibold text-white transition hover:bg-brand-deep">
              <PortalIcon name="upload" />
              {t(PORTAL_COPY.uploadButton, locale)}
            </button>
          </form>
        </Panel>

        <Panel dark className="flex flex-col gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <PortalIcon name="shield" />
          </span>
          <h2 className="text-lg font-bold">{t(PORTAL_COPY.privacyTitle, locale)}</h2>
          <p className="text-[15px] leading-relaxed text-white/80">{t(PORTAL_COPY.privacyBody, locale)}</p>
          {stored.length ? (
            <form action={deleteReportsAction} className="mt-2 flex flex-col gap-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="case" value={record._id} />
              <label className="flex items-start gap-3 text-sm text-white/85">
                <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 h-5 w-5 accent-white" />
                {t(PORTAL_COPY.deleteConfirm, locale)}
              </label>
              <button type="submit" className="min-h-11 self-start rounded-full px-5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10">
                {t(PORTAL_COPY.deleteReports, locale)}
              </button>
            </form>
          ) : null}
        </Panel>
      </div>

      <Panel>
        <h2 className="text-lg font-bold text-navy">
          {t(PORTAL_COPY.reportsTitle, locale)} <span className="font-semibold text-slate">({record.reports.length})</span>
        </h2>
        {record.reports.length === 0 ? (
          <p className="mt-3 text-[15px] text-slate">{t(PORTAL_COPY.reportsNone, locale)}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#eeebf7]">
            {record.reports.map((report, index) => {
              const storedId = report.id ? `${record._id}-${report.id}` : null;
              const held = storedId ? stored.find((item) => item._id === storedId) : null;
              return (
                <li key={report.id ?? `${report.filename}-${index}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-surface-muted text-xs font-bold text-violet">
                    {kindOf(report.mediaType)}
                  </span>
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate font-semibold text-navy">{report.filename}</span>
                    <span className="block text-sm text-slate">
                      {size(report.bytes)}
                      {held ? ` · ${t(PORTAL_COPY.keptUntil, locale)} ${day(held.expiresAt)}` : ` · ${t(PORTAL_COPY.notStored, locale)}`}
                    </span>
                  </span>
                  {held && storedId && storedIds.has(storedId) ? (
                    <a
                      href={`/api/patient/report/${record._id}/${report.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-violet ring-1 ring-violet-line transition hover:bg-violet-soft"
                    >
                      <PortalIcon name="download" className="h-4 w-4" />
                      {t(report.mediaType === "application/pdf" || report.mediaType.startsWith("image/") ? PORTAL_COPY.openFile : PORTAL_COPY.downloadFile, locale)}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </PortalFrame>
  );
}
