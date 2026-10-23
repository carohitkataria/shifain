import Link from "next/link";
import { AppShell, Hidden, SecHead, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { fmtDay, money } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { balanceDue, paidTotal } from "@/lib/journey-rules";
import { canSee } from "@/lib/patient-portal";
import { t } from "@/lib/localize";
import { payAction } from "../../app-actions";

export const dynamic = "force-dynamic";

const LINE_ICON = ["heart", "hospital", "bed", "car", "translate", "plane", "wallet"];
const LINE_TONE = ["c-rose", "c-violet", "c-teal", "c-sky", "c-amber", "c-green", "c-off"];

/** The confirmed price, what is paid and due, its parts, and the receipts. Paying is a link the coordinator sends. */
export default async function PaymentsPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, portal } = app;
  if (!record || !canSee(portal.viewer, "payments")) {
    return (
      <AppShell app={app} section="payments">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const billing = record.billing;
  const currency = billing?.currency ?? "USD";
  const paid = paidTotal(billing);
  const due = balanceDue(billing);
  const bills = record.reports.filter((file) => file.kind === "bill");
  const payRequested = (record.tasks ?? []).some((task) => task.owner === "desk" && task.status === "open" && task.section === "payments");

  return (
    <AppShell app={app} section="payments">
      {billing?.quote != null ? (
        <div className="a-card a-pad">
          <div className="a-row a-between">
            <span className="a-tiny a-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
              {t(APP.estimateConfirmed, locale)}
            </span>
            <span className="a-pill t-ok">{t(APP.confirmed, locale)}</span>
          </div>
          <div className="a-row" style={{ alignItems: "flex-end", gap: 6, marginTop: 6 }}>
            <span className="a-display" style={{ fontSize: 28, letterSpacing: "-0.5px" }}>
              {money(billing.quote, currency)}
            </span>
            <span className="a-tiny a-muted">{t(APP.allInclusive, locale)}</span>
          </div>
          <div className="a-bar" style={{ marginTop: 12 }}>
            <span style={{ width: `${Math.min(100, Math.round((paid / Math.max(1, billing.quote)) * 100))}%` }} />
          </div>
          <div className="a-row a-between a-tiny" style={{ marginTop: 6 }}>
            <span>
              <b>{money(paid, currency)}</b> {t(APP.paid, locale)}
            </span>
            <span className="a-muted">
              <b style={{ color: "var(--ink)" }}>{money(due ?? 0, currency)}</b> {t(APP.due, locale)}
              {billing.dueNote ? ` · ${billing.dueNote}` : ""}
            </span>
          </div>
          {due && portal.viewer?.role === "patient" ? (
            payRequested ? (
              <p className="a-hint">
                <AppIcon name="clock" />
                <span>{t(APP.payRequested, locale)}</span>
              </p>
            ) : (
              <form action={payAction}>
                <Hidden app={app} section="payments" />
                <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
                  <AppIcon name="cash" />
                  {t(APP.payNow, locale)}
                </button>
              </form>
            )
          ) : null}
        </div>
      ) : (
        <div className="a-card a-pad">
          <p className="a-tiny a-muted">{t(APP.noQuote, locale)}</p>
          <Link href={href(app, "plan")} className="a-btn a-btn-t a-w" style={{ marginTop: 12 }}>
            <AppIcon name="eye" />
            {t(APP.seeEstimate, locale)}
          </Link>
        </div>
      )}

      {billing?.lines.length ? (
        <section className="a-sec">
          <SecHead icon="wallet" title={t(APP.breakdown, locale)} />
          <ul className="a-card a-list">
            {billing.lines.map((line, index) => (
              <li key={`${line.label}-${index}`} className="a-li">
                <span className={`a-chip ${LINE_TONE[index % LINE_TONE.length]}`}>
                  <AppIcon name={LINE_ICON[index % LINE_ICON.length]} />
                </span>
                <span className="a-t">
                  <b>{line.label}</b>
                </span>
                <b>{money(line.amount, currency)}</b>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {billing?.payments.length || bills.length ? (
        <section className="a-sec">
          <SecHead icon="file" title={t(APP.receipts, locale)} />
          <ul className="a-card a-list">
            {[...(billing?.payments ?? [])].reverse().map((payment) => (
              <li key={payment.id} className="a-li">
                <span className="a-chip c-green">
                  <AppIcon name="check" />
                </span>
                <span className="a-t">
                  <b>{money(payment.amount, currency)}</b>
                  <small>
                    {fmtDay(payment.at, locale)} · {payment.method}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </small>
                </span>
              </li>
            ))}
            {bills.map((file, index) => (
              <li key={file.id ?? index} className="a-li">
                <span className="a-chip c-violet">
                  <AppIcon name="file" />
                </span>
                <span className="a-t">
                  <b>{file.filename}</b>
                  <small>{t(APP.from[file.source ?? "patient"], locale)}</small>
                </span>
                {file.id ? (
                  <a href={`/api/patient/report/${record._id}/${file.id}`} target="_blank" rel="noopener noreferrer" className="a-ibtn" aria-label={`${t(APP.view, locale)} ${file.filename}`}>
                    <AppIcon name="download" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
