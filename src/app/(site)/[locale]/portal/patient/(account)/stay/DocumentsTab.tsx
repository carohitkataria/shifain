import Link from "next/link";
import { AppShell, Hidden, STAY_TABS, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { UploadButton } from "@/components/patient-app/client";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { documentList, type DocStatus } from "@/lib/journey-rules";
import { t } from "@/lib/localize";
import { uploadAction } from "../../app-actions";

const DOC_ICON: Record<string, string> = { passport: "passport", visa: "shield", invitation: "mail", ticket: "plane", consent: "edit", insurance: "shield" };
const TONE: Record<DocStatus, [string, string]> = {
  needed: ["c-amber", "t-due"],
  uploaded: ["c-violet", "t-sch"],
  verified: ["c-green", "t-ok"],
  issued: ["c-green", "t-ok"],
  signed: ["c-green", "t-ok"],
  optional: ["c-off", "t-off"],
};

/** The trip's paperwork: what is needed, what is being checked, what is ready to download. */
export async function DocumentsTab(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, portal } = app;
  if (!record) {
    return (
      <AppShell app={app} section="stay" tabs={STAY_TABS("documents")}>
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const isPatient = portal.viewer?.role === "patient";
  const docs = documentList(record);
  const fileFor = (key: string) => [...record.reports].reverse().find((file) => file.docKey === key && file.id);
  const travellers = (record.family ?? []).filter((member) => member.travelling);

  return (
    <AppShell app={app} section="stay" tabs={STAY_TABS("documents")}>
      <ul className="a-card a-list">
        {docs.map((doc) => {
          const [chip, pill] = TONE[doc.status];
          const file = fileFor(doc.key);
          return (
            <li key={doc.key}>
              <div className="a-li">
                <span className={`a-chip ${chip}`}>
                  <AppIcon name={DOC_ICON[doc.key]} />
                </span>
                <span className="a-t">
                  <b>{t(APP.docs[doc.key], locale)}</b>
                  {doc.note ? <small>{doc.note}</small> : null}
                </span>
                {file ? (
                  <a href={`/api/patient/report/${record._id}/${file.id}`} target="_blank" rel="noopener noreferrer" className="a-ibtn" aria-label={`${t(APP.view, locale)} ${t(APP.docs[doc.key], locale)}`}>
                    <AppIcon name="download" />
                  </a>
                ) : null}
                <span className={`a-pill ${pill}`}>{t(APP.docStatus[doc.status], locale)}</span>
              </div>
              {isPatient && (doc.status === "needed" || (doc.status === "optional" && !file)) ? (
                <form action={uploadAction} encType="multipart/form-data" className="a-row" style={{ padding: "0 14px 12px" }}>
                  <Hidden app={app} section="stay" tab="documents" />
                  <input type="hidden" name="docKey" value={doc.key} />
                  <UploadButton label={t(APP.upload, locale)} className="a-btn a-btn-t" style={{ flex: 1, minHeight: 38 }} />
                </form>
              ) : null}
            </li>
          );
        })}
        {travellers.map((member) => (
          <li key={member.id}>
            <Link href={href(app, "family")} className="a-li a-tap">
              <span className={`a-chip ${member.passport === "missing" ? "c-amber" : "c-green"}`}>
                <AppIcon name="passport" />
              </span>
              <span className="a-t">
                <b>
                  {t(APP.docs.passport, locale)} · {member.name}
                </b>
                <small>{t(APP.relations[member.relation], locale)}</small>
              </span>
              <span className={`a-pill ${member.passport === "missing" ? "t-due" : member.passport === "verified" ? "t-ok" : "t-sch"}`}>
                {t(member.passport === "missing" ? APP.docStatus.needed : member.passport === "verified" ? APP.docStatus.verified : APP.docStatus.uploaded, locale)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="a-hint">
        <AppIcon name="shield" />
        <span>{t(APP.docsHint, locale)}</span>
      </p>
    </AppShell>
  );
}
