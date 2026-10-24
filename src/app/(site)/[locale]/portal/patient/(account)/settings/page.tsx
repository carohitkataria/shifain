import Link from "next/link";
import { AppShell, Hidden, SecHead, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { AutoToggle } from "@/components/patient-app/client";
import { APP } from "@/lib/patient-app-copy";
import { initials, loadApp, type AppProps } from "@/lib/patient-app";
import { CHANNELS, suggestedMessenger } from "@/lib/journey-rules";
import { COUNTRY_BY_NAME } from "@/lib/countries";
import { LOCALES, LOCALE_META } from "@/lib/i18n";
import { t } from "@/lib/localize";
import { channelsAction, homeContactAction, privacyAction } from "../../app-actions";
import { patientLogoutAction, setPasswordAction } from "../../actions";

export const dynamic = "force-dynamic";

const CHANNEL_ICON: Record<string, [string, string]> = {
  telegram: ["tg", "var(--tg)"],
  whatsapp: ["wa", "var(--wa)"],
  call: ["phone", "var(--ink-soft)"],
  email: ["mail", "var(--ink-soft)"],
};

/** Who they are, how to reach them (chosen at sign-up, changeable here), language, privacy, a contact at home. */
export default async function SettingsPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, portal, channels } = app;
  const account = portal.account;
  const name = (account ? [account.firstName, account.lastName].filter(Boolean).join(" ") : "") || record?.patient.name || "";
  const email = account?.email ?? record?.patient.email ?? (portal.identity.kind === "email" ? portal.identity.email : null);
  const phone = record?.patient.phone ?? (account ? `${account.dial} ${account.phone}` : null);
  const country = record?.patient.country ?? account?.country ?? null;
  const suggested = suggestedMessenger(country ? COUNTRY_BY_NAME.get(country)?.code : null);
  const isPatient = portal.viewer?.role === "patient";
  const home = record?.preferences?.homeContact;

  return (
    <AppShell app={app} section="settings">
      <div className="a-card a-pad">
        <div className="a-person">
          <span className="a-av">{initials(name)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{name || "—"}</b>
            <div className="a-tiny a-muted">{[email, phone].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
      </div>

      <section className="a-sec" id="password">
        <SecHead icon="lock" title={t(APP.password.title, locale)} action={account?.passwordHash ? <span className="a-pill t-ok">{t(APP.password.isSet, locale)}</span> : null} />
        <div className="a-card a-pad">
          {/* Email sign-ins can always set one: the account is made from their case if needed. */}
          {account || portal.identity.kind === "email" ? (
            <form action={setPasswordAction}>
              <input type="hidden" name="locale" value={locale} />
              <p className="a-tiny a-muted" style={{ marginTop: 0 }}>
                {t(app.query.set === "password" ? APP.password.resetNow : APP.password.lead, locale)}
              </p>
              {app.query.error === "short" || app.query.error === "mismatch" || app.query.error === "noaccount" ? (
                <p className="a-hint a-alert" role="alert">
                  <AppIcon name="alert" />
                  <span>{t(app.query.error === "short" ? APP.password.short : app.query.error === "mismatch" ? APP.password.mismatch : APP.password.noAccount, locale)}</span>
                </p>
              ) : null}
              <input type="text" name="username" autoComplete="username" defaultValue={account?.email ?? email ?? ""} hidden readOnly />
              <label className="a-field">
                <span>{t(APP.password.fresh, locale)}</span>
                <input className="a-input" name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" autoFocus={app.query.set === "password"} />
              </label>
              <label className="a-field">
                <span>{t(APP.password.again, locale)}</span>
                <input className="a-input" name="confirm" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
              </label>
              <p className="a-tiny a-muted">{t(APP.password.min, locale)}</p>
              <button className="a-btn a-btn-p a-w" style={{ marginTop: 10 }}>
                <AppIcon name="lock" />
                {t(APP.password.save, locale)}
              </button>
            </form>
          ) : (
            <p className="a-tiny a-muted" style={{ margin: 0 }}>
              {t(APP.password.noAccount, locale)}
            </p>
          )}
        </div>
      </section>

      {record && isPatient ? (
        <section className="a-sec">
          <SecHead icon="chat" title={t(APP.reachMe, locale)} action={<span className="a-tiny a-muted">{t(APP.reachHint, locale)}</span>} />
          <form action={channelsAction}>
            <Hidden app={app} section="settings" />
            <div className="a-g4">
              {CHANNELS.map((channel) => (
                <label key={channel} className="a-ch">
                  <input type="checkbox" name="channels" value={channel} defaultChecked={channels.channels.includes(channel)} />
                  {channel === suggested ? <span className="a-star">{t(APP.suggested, locale)}</span> : null}
                  <AppIcon name={CHANNEL_ICON[channel][0]} className="" />
                  {t(APP[channel === "telegram" ? "telegram" : channel === "whatsapp" ? "whatsapp" : channel === "call" ? "call" : "email"], locale)}
                </label>
              ))}
            </div>
            <div className="a-field">
              <span>★ {t(APP.makeMain, locale)}</span>
              <div className="a-seg">
                {CHANNELS.map((channel) => (
                  <label key={channel}>
                    <input type="radio" name="main" value={channel} defaultChecked={channels.main === channel} />
                    {t(APP[channel === "telegram" ? "telegram" : channel === "whatsapp" ? "whatsapp" : channel === "call" ? "call" : "email"], locale)}
                  </label>
                ))}
              </div>
            </div>
            <button className="a-btn a-btn-s a-w" style={{ marginTop: 10 }}>
              <AppIcon name="check" />
              {t(APP.save, locale)}
            </button>
          </form>
        </section>
      ) : null}

      <section className="a-sec">
        <SecHead icon="globe" title={t(APP.language, locale)} />
        <div className="a-seg">
          {LOCALES.map((code) => (
            <Link key={code} href={`/${code}/portal/patient/settings${record && portal.cases.length > 1 ? `?case=${record._id}` : ""}`} aria-current={code === locale ? "page" : undefined}>
              {LOCALE_META[code].label}
            </Link>
          ))}
        </div>
      </section>

      {record && isPatient ? (
        <section className="a-sec">
          <SecHead icon="lock" title={t(APP.privacy, locale)} />
          <div className="a-card a-list">
            <form action={privacyAction}>
              <Hidden app={app} section="settings" />
              <label className="a-li a-tog-label">
                <span className="a-t">
                  <b>{t(APP.showInCompanions, locale)}</b>
                  <small>{t(APP.showInCompanionsSub, locale)}</small>
                </span>
                <AutoToggle name="companions" defaultChecked={Boolean(record.preferences?.companionsVisible)} label={t(APP.showInCompanions, locale)} />
              </label>
            </form>
            <Link href={href(app, "family")} className="a-li a-tap">
              <span className="a-t">
                <b>{t(APP.titles.family, locale)}</b>
                <small>{(record.family ?? []).map((member) => member.name.split(" ")[0]).join(", ") || "—"}</small>
              </span>
              <AppIcon name="right" />
            </Link>
            <details>
              <summary className="a-li a-tap" style={{ listStyle: "none" }}>
                <span className="a-t">
                  <b>{t(APP.homeContact, locale)}</b>
                  <small>{home ? `${home.name}${home.relation ? ` · ${home.relation}` : ""} · ${home.phone}` : "—"}</small>
                </span>
                <AppIcon name="right" />
              </summary>
              <form action={homeContactAction} style={{ padding: "0 14px 14px" }}>
                <Hidden app={app} section="settings" />
                <div className="a-row">
                  <label className="a-field" style={{ flex: 1 }}>
                    <span>{t(APP.name, locale)}</span>
                    <input className="a-input" name="name" defaultValue={home?.name ?? ""} maxLength={80} />
                  </label>
                  <label className="a-field" style={{ flex: 1 }}>
                    <span>{t(APP.relation, locale)}</span>
                    <input className="a-input" name="relation" defaultValue={home?.relation ?? ""} maxLength={40} />
                  </label>
                </div>
                <label className="a-field">
                  <span>{t(APP.phone, locale)}</span>
                  <input className="a-input" name="phone" inputMode="tel" defaultValue={home?.phone ?? ""} maxLength={30} placeholder="+" />
                </label>
                <button className="a-btn a-btn-p a-w" style={{ marginTop: 10 }}>
                  {t(APP.save, locale)}
                </button>
              </form>
            </details>
          </div>
        </section>
      ) : null}

      <form action={patientLogoutAction}>
        <input type="hidden" name="locale" value={locale} />
        <button className="a-btn a-btn-s a-w" style={{ marginTop: 16, color: "var(--red)" }}>
          <AppIcon name="logout" />
          {t(APP.signOut, locale)}
        </button>
      </form>
    </AppShell>
  );
}
