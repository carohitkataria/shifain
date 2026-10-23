import Link from "next/link";
import { AppShell, Hidden, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { AutoToggle } from "@/components/patient-app/client";
import { fmtDay } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { initials, loadApp, type AppProps } from "@/lib/patient-app";
import { candidateOf, companionCandidates, helloes } from "@/lib/journey";
import { companionMatches } from "@/lib/journey-rules";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";
import { t } from "@/lib/localize";
import { helloAction, privacyAction } from "../../app-actions";

export const dynamic = "force-dynamic";

const GROUPS = ["hotel", "hospital", "city"] as const;

/**
 * People from the same country, here at the same time, who chose to be seen:
 * at the same hotel, the same hospital or in the same city. Only first names,
 * languages and dates; a hello on both sides asks the desk to introduce them.
 */
export default async function CompanionsPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record } = app;
  if (!record) {
    return (
      <AppShell app={app} section="companions">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const visible = Boolean(record.preferences?.companionsVisible);
  const isPatient = app.portal.viewer?.role === "patient";
  const [pool, hellos] = visible ? await Promise.all([companionCandidates(), helloes(record._id)]) : [[], []];
  const matches = companionMatches(candidateOf(record), pool);
  const group = (GROUPS as readonly string[]).includes(app.query.f ?? "") ? (app.query.f as (typeof GROUPS)[number]) : (GROUPS.find((key) => matches[key].length) ?? "hotel");
  const sent = new Set(hellos.filter((item) => item.from === record._id).map((item) => item.to));
  const received = new Set(hellos.filter((item) => item.to === record._id).map((item) => item.from));
  const language = (code: string) => PORTAL_LANGUAGES.find((item) => item.code === code)?.native ?? code.toUpperCase();

  return (
    <AppShell app={app} section="companions">
      <form action={privacyAction} className="a-card a-pad">
        <Hidden app={app} section="companions" />
        <label className="a-tog-label">
          <span className="a-chip c-violet">
            <AppIcon name="users" />
          </span>
          <span style={{ flex: 1 }}>
            <b style={{ fontSize: 14, display: "block" }}>{t(APP.companionsTitle, locale)}</b>
            <span className="a-tiny a-muted">{t(APP.companionsSub, locale)}</span>
          </span>
          <AutoToggle name="companions" defaultChecked={visible} disabled={!isPatient} label={t(APP.showMe, locale)} />
        </label>
      </form>

      {visible ? (
        <>
          <div className="a-g3 a-sec">
            {GROUPS.map((key) => (
              <Link key={key} href={href(app, "companions", `f=${key}`)} className={`a-ch ${group === key ? "on" : ""}`} aria-current={group === key ? "page" : undefined}>
                <AppIcon name={key === "hotel" ? "bed" : key === "hospital" ? "hospital" : "pin"} />
                {t(key === "hotel" ? APP.sameHotel : key === "hospital" ? APP.sameHospital : APP.sameCity, locale)} · {matches[key].length}
              </Link>
            ))}
          </div>
          <ul className="a-card a-list a-sec">
            {matches[group].length === 0 ? (
              <li className="a-li">
                <span className="a-t">
                  <small>{t(APP.noCompanions, locale)}</small>
                </span>
              </li>
            ) : null}
            {matches[group].map((person) => {
              const mutual = sent.has(person.reference) && received.has(person.reference);
              return (
                <li key={person.reference} className="a-li">
                  <span className="a-av" style={{ width: 38, height: 38, borderRadius: 11, fontSize: 12 }}>
                    {initials(person.firstName)}
                  </span>
                  <span className="a-t">
                    <b>{person.firstName}</b>
                    <small>
                      {[person.from ? t(APP.here(fmtDay(person.from, locale), person.to ? fmtDay(person.to, locale) : null), locale) : null, language(person.locale)].filter(Boolean).join(" · ")}
                    </small>
                    {mutual ? <small style={{ color: "var(--green)", fontWeight: 700 }}>{t(APP.connected, locale)}</small> : received.has(person.reference) ? <small style={{ color: "var(--primary)", fontWeight: 700 }}>{t(APP.saidHiBack, locale)}</small> : null}
                  </span>
                  {sent.has(person.reference) ? (
                    <span className="a-pill t-ok">{t(APP.saidHi, locale)}</span>
                  ) : isPatient ? (
                    <form action={helloAction}>
                      <Hidden app={app} section="companions" />
                      <input type="hidden" name="to" value={person.reference} />
                      <button className="a-btn a-btn-t" style={{ minHeight: 36, padding: "0 12px" }}>
                        <AppIcon name="chat" />
                        {t(APP.hi, locale)}
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="a-hint">
            <AppIcon name="lock" />
            <span>{t(APP.companionsPrivacy, locale)}</span>
          </p>
        </>
      ) : (
        <p className="a-hint">
          <AppIcon name="users" />
          <span>{t(APP.companionsOff, locale)}</span>
        </p>
      )}
    </AppShell>
  );
}
