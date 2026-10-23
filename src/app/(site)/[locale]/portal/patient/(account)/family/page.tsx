import { AppShell, Hidden } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { OpenSheet, UploadButton } from "@/components/patient-app/client";
import { AddFamilySheet } from "@/components/patient-app/sheets";
import { APP } from "@/lib/patient-app-copy";
import { initials, loadApp, type AppProps } from "@/lib/patient-app";
import { FAMILY_ACCESS } from "@/lib/journey-rules";
import { t } from "@/lib/localize";
import { familyUpdateAction, uploadAction } from "../../app-actions";

export const dynamic = "force-dynamic";

const ACCESS_ICON: Record<string, string> = { reports: "file", calendar: "calendar", payments: "wallet" };

/** Who came with the patient, or follows from home: what each may see, and their passport for the visa. */
export default async function FamilyPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, portal } = app;
  if (!record) {
    return (
      <AppShell app={app} section="family">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const isPatient = portal.viewer?.role === "patient";
  const family = record.family ?? [];

  return (
    <AppShell app={app} section="family" sheets={isPatient ? <AddFamilySheet app={app} section="family" /> : null}>
      {family.length === 0 ? <p className="a-card a-pad a-tiny a-muted">{t(APP.noFamily, locale)}</p> : null}
      <ul className="a-card a-list">
        {family.map((member) => (
          <li key={member.id}>
            <details>
              <summary className="a-li a-tap" style={{ listStyle: "none" }}>
                <span className="a-av" style={{ width: 40, height: 40, borderRadius: 12, fontSize: 13 }}>
                  {initials(member.name)}
                </span>
                <span className="a-t">
                  <b>{member.name}</b>
                  <small>
                    {t(APP.relations[member.relation], locale)}
                    {member.travelling ? ` · ${t(APP.travelling, locale)}` : ""}
                  </small>
                  <span className="a-row a-wrap" style={{ gap: 4, marginTop: 5 }}>
                    {member.access.map((access) => (
                      <span key={access} className="a-pill t-sch">
                        {t(APP.access[access], locale)}
                      </span>
                    ))}
                    {member.travelling ? <span className={`a-pill ${member.passport === "missing" ? "t-due" : "t-ok"}`}>{t(member.passport === "missing" ? APP.passportNeeded : APP.passportOk, locale)}</span> : null}
                  </span>
                </span>
                <AppIcon name="right" />
              </summary>
              {isPatient ? (
                <div style={{ padding: "0 14px 14px" }}>
                  <form action={familyUpdateAction}>
                    <Hidden app={app} section="family" />
                    <input type="hidden" name="id" value={member.id} />
                    <p className="a-tiny a-muted">{[member.phone, member.email].filter(Boolean).join(" · ")}</p>
                    <div className="a-g3" style={{ marginTop: 10 }}>
                      {FAMILY_ACCESS.map((access) => (
                        <label key={access} className="a-ch">
                          <input type="checkbox" name="access" value={access} defaultChecked={member.access.includes(access)} />
                          <AppIcon name={ACCESS_ICON[access]} />
                          {t(APP.access[access], locale)}
                        </label>
                      ))}
                    </div>
                    <label className="a-tog-label a-li" style={{ padding: "12px 0" }}>
                      <span className="a-t">
                        <b>{t(APP.travelling, locale)}</b>
                        <small>{t(APP.travellingHint, locale)}</small>
                      </span>
                      <input type="checkbox" name="travelling" defaultChecked={member.travelling} />
                      <span className="a-toggle-ui" />
                    </label>
                    <div className="a-row">
                      <button className="a-btn a-btn-p" style={{ flex: 1 }}>
                        <AppIcon name="check" />
                        {t(APP.save, locale)}
                      </button>
                      <button name="remove" value="1" className="a-btn a-btn-s" style={{ color: "var(--red)" }}>
                        {t(APP.remove, locale)}
                      </button>
                    </div>
                  </form>
                  {member.travelling && member.passport === "missing" ? (
                    <form action={uploadAction} encType="multipart/form-data" style={{ marginTop: 10 }}>
                      <Hidden app={app} section="family" />
                      <input type="hidden" name="familyId" value={member.id} />
                      <UploadButton label={`${t(APP.passportNeeded, locale)} · ${t(APP.upload, locale)}`} className="a-btn a-btn-t a-w" />
                    </form>
                  ) : null}
                </div>
              ) : null}
            </details>
          </li>
        ))}
      </ul>
      {isPatient ? (
        <OpenSheet id="addfam" className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
          <AppIcon name="plus" />
          {t(APP.addFamily, locale)}
        </OpenSheet>
      ) : null}
      <p className="a-hint">
        <AppIcon name="shield" />
        <span>{t(APP.familyHint, locale)}</span>
      </p>
    </AppShell>
  );
}
