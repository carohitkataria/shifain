import Link from "next/link";
import { AppShell, MoreLink, SecHead, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { Greeting, OpenSheet } from "@/components/patient-app/client";
import { AskSheet, BookSheet, PickupSheet } from "@/components/patient-app/sheets";
import { PlanGrid, TodoRow } from "@/components/patient-app/rows";
import { balanceOf, eventTitle, fmtDay, money } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { doctorOptions, indiaNow, loadApp, telHref, tgHref, waHref, type AppProps } from "@/lib/patient-app";
import { STAGES, arrivalDate, nextEvent, stagesDone } from "@/lib/journey-rules";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

/** Home: where the trip stands, what is next, what is open — every tile opens its screen. */
export default async function PatientHome(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, ctx, today } = app;
  const account = app.portal.account;
  // The name exactly as the patient wrote it — no guessing at titles or which word is the "first" name.
  const first = (app.portal.viewer?.role === "family" ? app.portal.viewer.member.name : account?.firstName || (record?.patient.name !== "Website patient" ? record?.patient.name : "") || "").trim();
  const greet = { hello: t(APP.greeting.hello, locale), morning: t(APP.greeting.morning, locale), afternoon: t(APP.greeting.afternoon, locale), evening: t(APP.greeting.evening, locale), night: t(APP.greeting.night, locale) };

  if (!record) {
    return (
      <AppShell app={app} section="home">
        <Greeting name={first} labels={greet} locale={locale} />
        <div className="a-card a-pad a-sec">
          <p style={{ fontSize: 13.5 }}>{t(APP.noCase, locale)}</p>
          <Link href={href(app, "new")} className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
            <AppIcon name="plus" />
            {t(APP.startCase, locale)}
          </Link>
        </div>
      </AppShell>
    );
  }

  const arrival = arrivalDate(record);
  const days = arrival ? Math.round((Date.parse(`${arrival}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) : null;
  const done = stagesDone(record, today);
  const next = nextEvent(app.events, today, indiaNow());
  const nextIsCar = next && (next.source === "ride" || /pickup|transfer|airport|car/i.test(`${next.title} ${next.id}`));
  const driver = ctx?.driver;
  const due = balanceOf(app);
  const patientTodo = app.todo;
  const { slots } = await doctorOptions(ctx);

  return (
    <AppShell
      app={app}
      section="home"
      wide
      sheets={
        <>
          <BookSheet app={app} section="home" slots={slots} />
          <PickupSheet app={app} section="stay" />
          <AskSheet app={app} section="messages" />
        </>
      }
    >
      <Greeting name={first} labels={greet} locale={locale}>
        {days != null ? (
          <>
            {" · "}
            <b style={{ color: "var(--primary)" }}>{days > 0 ? t(APP.daysToTravel(days), locale) : days === 0 ? t(APP.travelToday, locale) : t(APP.inIndia, locale)}</b>
          </>
        ) : null}
      </Greeting>

      <Link href={href(app, "case")} className="a-card a-pad a-tap" style={{ marginTop: 14 }}>
        <div className="a-row a-between">
          <span className="a-tiny a-muted" style={{ fontWeight: 700, textTransform: "uppercase" }}>
            {t(APP.journey, locale)}
          </span>
          <span className="a-pill t-sch">{t(APP.stepOf(Math.min(done + 1, STAGES.length), STAGES.length), locale)}</span>
        </div>
        <div className="a-steps">
          {STAGES.map((stage, index) => (
            <div key={stage} className={`a-s ${index < done ? "done" : index === done ? "now" : ""}`}>
              <i>{index < done ? <AppIcon name="check" /> : null}</i>
              {t(APP.stages[stage], locale)}
            </div>
          ))}
        </div>
      </Link>

      <div className="a-kgrid a-sec">
        <Link href={href(app, "calendar")} className="a-card a-kpi a-tap">
          <span className="a-chip c-violet">
            <AppIcon name="plane" />
          </span>
          <div>
            <div className="a-v">{arrival ? fmtDay(arrival, locale) : t(APP.kpi.notSet, locale)}</div>
            <div className="a-l">{t(APP.kpi.arrival, locale)}</div>
          </div>
        </Link>
        <Link href={href(app, "payments")} className="a-card a-kpi a-tap">
          <span className="a-chip c-amber">
            <AppIcon name="wallet" />
          </span>
          <div>
            <div className="a-v">{due != null ? money(due, record.billing?.currency ?? "USD") : t(APP.kpi.notSet, locale)}</div>
            <div className="a-l">{t(due != null ? APP.kpi.balance : APP.kpi.estimate, locale)}</div>
          </div>
        </Link>
        <Link href={href(app, "reports")} className="a-card a-kpi a-tap">
          <span className="a-chip c-teal">
            <AppIcon name="file" />
          </span>
          <div>
            <div className="a-v">{record.reports.length}</div>
            <div className="a-l">{t(APP.kpi.reports, locale)}</div>
          </div>
        </Link>
        <Link href={href(app, "tasks")} className="a-card a-kpi a-tap">
          <span className="a-chip c-rose">
            <AppIcon name="alert" />
          </span>
          <div>
            <div className="a-v">{patientTodo.length}</div>
            <div className="a-l">{t(APP.kpi.todo, locale)}</div>
          </div>
        </Link>
      </div>

      <div className="a-cols">
        <div className="a-col">
          <section className="a-sec">
            <SecHead icon="clock" title={t(APP.nextUp, locale)} action={<MoreLink to={href(app, "calendar")} label={t(APP.nav.calendar, locale)} />} />
            {next ? (
              <div className="a-card a-pad">
                <Link href={href(app, "calendar", `day=${next.date}&e=${next.id}`)} className="a-row a-tap">
                  <span className={`a-chip ${nextIsCar ? "c-sky" : "c-violet"}`}>
                    <AppIcon name={nextIsCar ? "car" : "calendar"} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{eventTitle(next, locale)}</b>
                    <div className="a-tiny a-muted">
                      {fmtDay(next.date, locale, true)}
                      {next.time ? ` · ${next.time}` : ""}
                      {nextIsCar && driver ? ` · ${driver.name.split(" ")[0]}${driver.vehicle?.plate ? ` · ${driver.vehicle.plate}` : ""}` : next.where ? ` · ${next.where}` : ""}
                    </div>
                  </div>
                </Link>
                {nextIsCar && driver ? (
                  <div className="a-actions" style={{ marginTop: 12 }}>
                    {driver.phone ? (
                      <a href={telHref(driver.phone)} className="a-btn a-btn-t">
                        <AppIcon name="phone" />
                        {t(APP.call, locale)}
                      </a>
                    ) : null}
                    {driver.telegram || driver.phone ? (
                      <a href={tgHref(driver.telegram ?? driver.phone!)} className="a-btn a-btn-tg" target="_blank" rel="noopener noreferrer">
                        <AppIcon name="tg" />
                        {t(APP.telegram, locale)}
                      </a>
                    ) : null}
                    {driver.whatsapp || driver.phone ? (
                      <a href={waHref(driver.whatsapp ?? driver.phone!)} className="a-btn a-btn-wa" target="_blank" rel="noopener noreferrer">
                        <AppIcon name="wa" />
                        {t(APP.whatsapp, locale)}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="a-card a-pad a-tiny a-muted">{t(APP.nothingNext, locale)}</p>
            )}
          </section>

          <section className="a-sec">
            <SecHead icon="alert" title={t(APP.todo, locale)} count={patientTodo.length} action={<MoreLink to={href(app, "tasks")} label={t(APP.all, locale)} />} />
            {patientTodo.length ? (
              <ul className="a-card a-list">
                {patientTodo.slice(0, 3).map((item) => (
                  <TodoRow key={item.id} item={item} app={app} />
                ))}
              </ul>
            ) : (
              <p className="a-card a-pad a-tiny a-muted">{t(APP.allClear, locale)}</p>
            )}
          </section>

          <section className="a-sec">
            <SecHead icon="case" title={t(APP.caseSummary, locale)} action={<MoreLink to={href(app, "case")} label={t(APP.open, locale)} />} />
            <ul className="a-card a-list">
              <li>
                <Link href={href(app, "case")} className="a-li a-tap">
                  <span className="a-chip c-rose">
                    <AppIcon name="heart" />
                  </span>
                  <span className="a-t">
                    <b>{app.names.disease ?? record.statedNeed ?? t(APP.caseShort, locale)}</b>
                    <small>{app.names.treatment ?? t(APP.fullPlan, locale)}</small>
                  </span>
                  <AppIcon name="right" />
                </Link>
              </li>
              {ctx?.doctor ? (
                <li>
                  <Link href={href(app, "case")} className="a-li a-tap">
                    <span className="a-chip c-violet">
                      <AppIcon name="stethoscope" />
                    </span>
                    <span className="a-t">
                      <b>{ctx.doctor.name}</b>
                      <small>{[ctx.doctor.designation, ctx.doctor.experienceYears ? `${ctx.doctor.experienceYears}+` : null].filter(Boolean).join(" · ")}</small>
                    </span>
                    <AppIcon name="right" />
                  </Link>
                </li>
              ) : null}
              {ctx?.hospital ? (
                <li>
                  <Link href={href(app, "case")} className="a-li a-tap">
                    <span className="a-chip c-teal">
                      <AppIcon name="hospital" />
                    </span>
                    <span className="a-t">
                      <b>{ctx.hospital.name}</b>
                      <small>{[ctx.hospital.city, ...(ctx.hospital.accreditations ?? []).slice(0, 2).map((item) => (typeof item === "string" ? item : item.name ?? item.body))].filter(Boolean).join(" · ")}</small>
                    </span>
                    <AppIcon name="right" />
                  </Link>
                </li>
              ) : null}
              {record.plan ? (
                <li>
                  <Link href={href(app, "calendar")} className="a-li a-tap">
                    <span className="a-chip c-amber">
                      <AppIcon name="calendar" />
                    </span>
                    <span className="a-t">
                      <b>
                        {arrival ? `${fmtDay(arrival, locale)} · ` : ""}
                        {record.plan.stay.daysInCountry} {locale === "ru" ? "дн." : locale === "uz" ? "kun" : "days"}
                      </b>
                      <small>
                        {record.plan.stay.inpatientNights} {locale === "ru" ? "ноч. в клинике" : locale === "uz" ? "kecha shifoxonada" : "nights in hospital"}
                      </small>
                    </span>
                    <AppIcon name="right" />
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>

        </div>
        <div className="a-col">
          <section className="a-sec">
            <SecHead icon="shield" title={t(APP.planStatus, locale)} action={<MoreLink to={href(app, "case")} label={t(APP.details, locale)} />} />
            <PlanGrid app={app} />
          </section>

          <section className="a-sec">
            <SecHead icon="grid" title={t(APP.quick, locale)} />
            <div className="a-g3">
              <OpenSheet id="book" className="a-tile">
                <AppIcon name="calendar" />
                {t(APP.quickTiles.book, locale)}
              </OpenSheet>
              <OpenSheet id="pickup" className="a-tile">
                <AppIcon name="car" />
                {t(APP.quickTiles.cab, locale)}
              </OpenSheet>
              <Link href={href(app, "reports")} className="a-tile">
                <AppIcon name="file" />
                {t(APP.quickTiles.reports, locale)}
              </Link>
              <Link href={href(app, "stay")} className="a-tile">
                <AppIcon name="bed" />
                {t(APP.quickTiles.stay, locale)}
              </Link>
              <Link href={href(app, "companions")} className="a-tile">
                <AppIcon name="users" />
                {t(APP.quickTiles.companions, locale)}
              </Link>
              <Link href={href(app, "family")} className="a-tile">
                <AppIcon name="family" />
                {t(APP.quickTiles.family, locale)}
                {record.family?.length ? <span className="a-bdg">{record.family.length}</span> : null}
              </Link>
              <Link href={href(app, "payments")} className="a-tile">
                <AppIcon name="wallet" />
                {t(APP.quickTiles.payments, locale)}
              </Link>
              <Link href={href(app, "documents")} className="a-tile">
                <AppIcon name="passport" />
                {t(APP.quickTiles.documents, locale)}
              </Link>
              <OpenSheet id="sos" className="a-tile red">
                <AppIcon name="phone" />
                {t(APP.quickTiles.emergency, locale)}
              </OpenSheet>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
