import Link from "next/link";
import { AppShell, CASE_TABS, SecHead, caseNeed, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { OpenSheet } from "@/components/patient-app/client";
import { BookSheet, ChangeDoctorSheet } from "@/components/patient-app/sheets";
import { fmtDay } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { doctorOptions, initials, loadApp, mapsHref, telHref, tgHref, type AppProps } from "@/lib/patient-app";
import { JOURNEY_KINDS } from "@/lib/journey-rules";
import { t } from "@/lib/localize";
import { HistoryTab } from "./HistoryTab";
import { PlanTab } from "./PlanTab";

export const dynamic = "force-dynamic";

const KIND_ICON: Record<string, string> = {
  visa: "shield",
  "flight-in": "plane",
  pickup: "car",
  hotel: "bed",
  consult: "stethoscope",
  admission: "hospital",
  procedure: "heart",
  physio: "pill",
  discharge: "logout",
  "follow-up": "calendar",
  "flight-out": "plane",
  other: "pin",
};
const STATUS_TONE: Record<string, string> = { pending: "t-due", booked: "t-sch", done: "t-ok", cancelled: "t-off" };

/** My case, in three tabs: the overview, the full plan and estimate, and what happened so far. */
export default async function CasePage(props: AppProps) {
  const { tab } = await props.searchParams;
  if (tab === "plan") return PlanTab(props);
  if (tab === "history") return HistoryTab(props);
  return CaseOverview(props);
}

/** The overview: the doctor (book, ask, change), the care team, every element of the plan, the hospital. */
async function CaseOverview(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, ctx, portal } = app;
  if (!record) {
    return (
      <AppShell app={app} section="case" tabs={CASE_TABS("overview")}>
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const { slots, peers } = await doctorOptions(ctx);
  const doctor = ctx?.doctor;
  const hospital = ctx?.hospital;
  const openChange = (record.requests ?? []).find((request) => request.status === "open");
  const lastChange = [...(record.requests ?? [])].reverse().find((request) => request.status !== "open");
  const journey = [...(record.journey ?? [])]
    .filter((item) => item.status !== "cancelled")
    .sort((a, b) => `${a.date ?? "9"}${a.time ?? ""}`.localeCompare(`${b.date ?? "9"}${b.time ?? ""}`) || JOURNEY_KINDS.indexOf(a.kind) - JOURNEY_KINDS.indexOf(b.kind));
  const isPatient = portal.viewer?.role === "patient";
  const team = [
    ctx?.coordinator ? { key: "c", name: ctx.coordinator.name, role: APP.coordinator, sub: ctx.coordinator.languages?.join(", ") || t(APP.allDay, locale), phone: ctx.coordinator.phone ?? null, telegram: ctx.coordinator.telegram ?? ctx.coordinator.phone ?? null, tone: "c-violet" } : null,
    ctx?.interpreter ? { key: "i", name: ctx.interpreter.name, role: APP.interpreter, sub: ctx.interpreter.languages.join(", "), phone: ctx.interpreter.phone, telegram: ctx.interpreter.telegram ?? ctx.interpreter.phone, tone: "c-teal" } : null,
    ctx?.driver ? { key: "d", name: ctx.driver.name, role: APP.driver, sub: [ctx.driver.vehicle?.model, ctx.driver.vehicle?.plate].filter(Boolean).join(" · "), phone: ctx.driver.phone, telegram: ctx.driver.telegram ?? ctx.driver.phone, tone: "c-sky" } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AppShell
      app={app}
      section="case"
      tabs={CASE_TABS("overview")}
      sheets={
        isPatient ? (
          <>
            <BookSheet app={app} section="case" slots={slots} />
            <ChangeDoctorSheet app={app} section="case" peers={peers} />
          </>
        ) : null
      }
    >
      {portal.cases.length > 1 || isPatient ? (
        <div className="a-chips" style={{ marginBottom: 12 }}>
          {portal.cases.length > 1
            ? portal.cases.map((item) => (
                <Link key={item._id} href={`/${locale}/portal/patient/case?case=${item._id}`} className={`a-fchip ${item._id === record._id ? "on" : ""}`}>
                  {(item.statedNeed || t(APP.caseShort, locale)).slice(0, 24)} · …{item._id.slice(-4)}
                </Link>
              ))
            : null}
          {isPatient ? (
            <Link href={`/${locale}/portal/patient/new`} className="a-fchip" aria-label={t(APP.newCase, locale)} title={t(APP.newCase, locale)}>
              <AppIcon name="plus" />
              {portal.cases.length > 1 ? null : t(APP.newCase, locale)}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="a-card a-pad">
        <div className="a-row a-between a-wrap">
          <span className="a-pill t-sch">{record._id}</span>
          {record.status === "confirmed" || record.status === "planned" ? <span className="a-pill t-ok">{t(APP.confirmedPlan, locale)}</span> : null}
        </div>
        <h3 style={{ fontSize: 18, marginTop: 10 }}>{caseNeed(app) ?? t(APP.caseShort, locale)}</h3>
        <p className="a-tiny a-muted">{[app.names.disease, record.plan?.destinationCity].filter(Boolean).join(" · ")}</p>
      </div>

      <section className="a-sec">
        <SecHead icon="stethoscope" title={t(APP.yourDoctor, locale)} />
        <div className="a-card a-pad">
          {doctor ? (
            <div className="a-person">
              <span className="a-av">{initials(doctor.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{doctor.name}</b>
                <div className="a-tiny a-muted">{[doctor.designation, doctor.experienceYears ? `${doctor.experienceYears}+` : null].filter(Boolean).join(" · ")}</div>
                {hospital ? (
                  <div className="a-tiny" style={{ color: "var(--primary)", fontWeight: 700 }}>
                    {hospital.name}, {hospital.city}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="a-tiny a-muted">{t(APP.noDoctor, locale)}</p>
          )}
          {openChange ? (
            <p className="a-hint">
              <AppIcon name="clock" />
              <span>{t(APP.changeRequested, locale)}</span>
            </p>
          ) : lastChange?.reply ? (
            <p className="a-hint">
              <AppIcon name="chat" />
              <span>{lastChange.reply}</span>
            </p>
          ) : null}
          {isPatient ? (
            <div className="a-actions" style={{ marginTop: 12 }}>
              <OpenSheet id="book" className="a-btn a-btn-t">
                <AppIcon name="calendar" />
                {t(APP.book, locale)}
              </OpenSheet>
              <Link href={href(app, "messages", "to=doctor")} className="a-btn a-btn-t">
                <AppIcon name="chat" />
                {t(APP.ask, locale)}
              </Link>
              <OpenSheet id="changedoc" className="a-btn a-btn-s">
                <AppIcon name="swapdoc" />
                {t(APP.change, locale)}
              </OpenSheet>
            </div>
          ) : null}
        </div>
      </section>

      <section className="a-sec">
        <SecHead icon="users" title={t(APP.careTeam, locale)} />
        <ul className="a-card a-list">
          {team.length === 0 ? (
            <li className="a-li">
              <span className="a-chip c-off">
                <AppIcon name="clock" />
              </span>
              <span className="a-t">
                <b>{t(APP.coordinator, locale)}</b>
                <small>{t(APP.notAssigned, locale)}</small>
              </span>
            </li>
          ) : null}
          {team.map((member) => (
            <li key={member.key} className="a-li">
              <span className={`a-av ${member.tone}`} style={{ width: 36, height: 36, borderRadius: 10, fontSize: 12 }}>
                {initials(member.name)}
              </span>
              <span className="a-t">
                <b>
                  {member.name} · {t(member.role, locale)}
                </b>
                <small>{member.sub}</small>
              </span>
              {member.telegram ? (
                <a href={tgHref(member.telegram)} className="a-ibtn" target="_blank" rel="noopener noreferrer" aria-label={`${t(APP.telegram, locale)} ${member.name}`}>
                  <AppIcon name="tg" className="" />
                </a>
              ) : null}
              {member.phone ? (
                <a href={telHref(member.phone)} className="a-ibtn" aria-label={`${t(APP.call, locale)} ${member.name}`}>
                  <AppIcon name="phone" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="a-sec">
        <SecHead icon="shield" title={t(APP.whatsInPlan, locale)} />
        <ul className="a-card a-list">
          {journey.length === 0
            ? app.tiles.map((tile) => (
                <li key={tile.key} className="a-li">
                  <span className={`a-chip ${tile.status === "ok" ? "c-green" : tile.status === "due" ? "c-amber" : tile.status === "sch" ? "c-violet" : "c-off"}`}>
                    <AppIcon name={tile.icon} />
                  </span>
                  <span className="a-t">
                    <b>{t(APP.tiles[tile.key as keyof typeof APP.tiles], locale)}</b>
                  </span>
                  <span className={`a-pill t-${tile.status}`}>{t(APP.tileStatus[tile.status], locale)}</span>
                </li>
              ))
            : journey.map((item) => (
                <li key={item.id}>
                  <Link href={href(app, "calendar", `day=${item.date ?? ""}&e=j-${item.id}`)} className="a-li a-tap">
                    <span className={`a-chip ${item.status === "done" ? "c-green" : item.status === "booked" ? "c-violet" : "c-amber"}`}>
                      <AppIcon name={KIND_ICON[item.kind] ?? "pin"} />
                    </span>
                    <span className="a-t">
                      <b>{item.title}</b>
                      <small>{[item.date ? `${fmtDay(item.date, locale, true)}${item.time ? ` · ${item.time}` : ""}` : null, item.place].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className={`a-pill ${STATUS_TONE[item.status]}`}>{t(item.status === "done" ? APP.tileStatus.ok : item.status === "booked" ? APP.tileStatus.sch : APP.tileStatus.due, locale)}</span>
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      {hospital ? (
        <section className="a-sec">
          <SecHead icon="hospital" title={t(APP.hospital, locale)} />
          <div className="a-card a-pad">
            <div className="a-person">
              <span className="a-av c-teal">
                <AppIcon name="hospital" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{hospital.name}</b>
                <div className="a-tiny a-muted">{[hospital.address ?? hospital.city, ctx?.care.ward].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            <div className="a-actions" style={{ marginTop: 12 }}>
              <OpenSheet id="sos" className="a-btn a-btn-red">
                <AppIcon name="phone" />
                {t(APP.emergency, locale)}
              </OpenSheet>
              <a href={mapsHref([hospital.name, hospital.address, hospital.city].filter(Boolean).join(", "))} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-t">
                <AppIcon name="nav" />
                {t(APP.directions, locale)}
              </a>
              <Link href={`/${locale}/hospitals/${hospital._id}`} className="a-btn a-btn-s">
                <AppIcon name="eye" />
                {t(APP.profile, locale)}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
