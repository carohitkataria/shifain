import Link from "next/link";
import { AppShell, Hidden, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { UploadButton } from "@/components/patient-app/client";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { canSee } from "@/lib/patient-portal";
import { t } from "@/lib/localize";
import { uploadAction } from "../../app-actions";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "hospital", "mine", "prescription"] as const;
const KIND_ICON: Record<string, [string, string]> = {
  report: ["file", "c-teal"],
  prescription: ["pill", "c-amber"],
  bill: ["wallet", "c-green"],
  document: ["passport", "c-violet"],
};

/**
 * The medical files on the case — the patient's own, and what the hospital and the desk added. Bills live
 * in Payments and passports, visas and tickets in Travel & stay, so they are not listed here.
 */
export default async function ReportsPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, portal } = app;
  if (!record || !canSee(portal.viewer, "reports")) {
    return (
      <AppShell app={app} section="reports">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const filter = (FILTERS as readonly string[]).includes(app.query.f ?? "") ? (app.query.f as (typeof FILTERS)[number]) : "all";
  const medical = record.reports.filter((file) => file.kind !== "bill" && file.kind !== "document" && !file.docKey);
  const files = [...medical]
    .reverse()
    .filter((file) => {
      const source = file.source ?? "patient";
      const kind = file.kind ?? "report";
      if (filter === "hospital") return source !== "patient";
      if (filter === "mine") return source === "patient";
      if (filter === "prescription") return kind === filter;
      return true;
    });
  const count = (key: (typeof FILTERS)[number]) =>
    key === "all" ? medical.length : medical.filter((file) => (key === "hospital" ? (file.source ?? "patient") !== "patient" : key === "mine" ? (file.source ?? "patient") === "patient" : file.kind === key)).length;
  const isPatient = portal.viewer?.role === "patient";

  return (
    <AppShell app={app} section="reports">
      {isPatient ? (
        <form action={uploadAction} encType="multipart/form-data">
          <Hidden app={app} section="reports" />
          <div className="a-row">
            <UploadButton label={t(APP.upload, locale)} className="a-btn a-btn-p" multiple style={{ flex: 1 }} />
            <Link href={href(app, "family")} className="a-btn a-btn-s">
              <AppIcon name="share" />
              {t(APP.quickTiles.family, locale)}
            </Link>
          </div>
          <p className="a-tiny a-muted" style={{ marginTop: 6 }}>
            {t(APP.uploadHint, locale)}
          </p>
        </form>
      ) : null}

      <div className="a-chips a-sec" style={{ marginTop: 14 }}>
        {FILTERS.map((key) => (
          <Link key={key} href={href(app, "reports", key === "all" ? "" : `f=${key}`)} className="a-fchip" aria-current={filter === key ? "page" : undefined}>
            {key === "hospital" ? <AppIcon name="hospital" /> : key === "mine" ? <AppIcon name="user" /> : key === "prescription" ? <AppIcon name="pill" /> : null}
            {t(APP.repFilters[key], locale)}
            {key === "all" ? ` · ${count(key)}` : ""}
          </Link>
        ))}
      </div>

      <ul className="a-card a-list" style={{ marginTop: 12 }}>
        {files.length === 0 ? (
          <li className="a-li">
            <span className="a-t">
              <small>{t(APP.noReports, locale)}</small>
            </span>
          </li>
        ) : null}
        {files.map((file, index) => {
          const [icon, tone] = KIND_ICON[file.kind ?? "report"] ?? KIND_ICON.report;
          const url = file.id ? `/api/patient/report/${record._id}/${file.id}` : null;
          return (
            <li key={file.id ?? index} className="a-li">
              <span className={`a-chip ${tone}`}>
                <AppIcon name={icon} />
              </span>
              <span className="a-t">
                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.docKey ? t(APP.docs[file.docKey], locale) : file.filename}</b>
                <small>{t(APP.from[file.source ?? "patient"], locale)}</small>
              </span>
              {url ? (
                <>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="a-ibtn" aria-label={`${t(APP.view, locale)} ${file.filename}`}>
                    <AppIcon name="eye" />
                  </a>
                  <a href={url} download={file.filename} className="a-ibtn" aria-label={`Download ${file.filename}`}>
                    <AppIcon name="download" />
                  </a>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="a-tiny a-muted" style={{ marginTop: 10 }}>
        {t(APP.retention(app.retentionDays), locale)}
      </p>
    </AppShell>
  );
}
