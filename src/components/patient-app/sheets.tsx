import { AppIcon } from "./AppIcon";
import { Counter, Sheet } from "./client";
import { Hidden, type Section } from "./AppShell";
import { APP } from "@/lib/patient-app-copy";
import { initials, type AppData } from "@/lib/patient-app";
import { CHANGE_REASONS, FAMILY_ACCESS, FAMILY_RELATIONS, PERSONAL_EVENT_KINDS, RIDE_PLACES } from "@/lib/journey-rules";
import type { Slot } from "@/lib/onboarding-rules";
import type { Doctor } from "@/lib/catalogue";
import { t } from "@/lib/localize";
import { bookAction, changeDoctorAction, eventAction, familyAddAction, messageAction, rideAction } from "@/app/(site)/[locale]/portal/patient/app-actions";

const PLACE_ICON: Record<string, string> = { hospital: "hospital", hotel: "bed", airport: "plane", pharmacy: "pill", food: "food", other: "pin" };
const REASON_ICON: Record<string, string> = { opinion: "eye", language: "translate", gender: "user", dates: "clock", cost: "wallet", other: "edit" };
const KIND_ICON: Record<string, string> = { family: "family", medicine: "pill", note: "edit" };
const ACCESS_ICON: Record<string, string> = { reports: "file", calendar: "calendar", payments: "wallet" };

const dayLabel = (iso: string, locale: string) => {
  const date = new Date(`${iso}T00:00:00`);
  return { dow: date.toLocaleDateString(locale === "en" ? "en-GB" : locale, { weekday: "short" }), day: date.getDate() };
};

/** Book the treating doctor: real slots from their rota, or a day and time of day when there is none on file. */
export function BookSheet({ app, section, slots }: { app: AppData; section: Section; slots: Slot[] }) {
  const { locale, ctx } = app;
  const doctor = ctx?.doctor;
  const days = slots.length ? [...new Set(slots.map((slot) => slot.date))].slice(0, 10) : Array.from({ length: 10 }, (_, index) => new Date(Date.parse(`${app.today}T00:00:00Z`) + (index + 1) * 86_400_000).toISOString().slice(0, 10));
  return (
    <Sheet id="book" title={t(APP.bookTitle, locale)}>
      <form action={bookAction}>
        <Hidden app={app} section={section} />
        {doctor && ctx?.care.hospitalId ? (
          <>
            <input type="hidden" name="doctorId" value={doctor._id} />
            <input type="hidden" name="hospitalId" value={ctx.care.hospitalId} />
          </>
        ) : null}
        <input type="hidden" name="language" value={locale} />
        <div className="a-person a-card a-pad">
          <span className="a-av">{doctor ? initials(doctor.name) : <AppIcon name="stethoscope" />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{doctor?.name ?? t(APP.yourDoctor, locale)}</b>
            <div className="a-tiny a-muted">{ctx?.hospital?.name ?? t(APP.noDoctor, locale)}</div>
          </div>
        </div>
        <div className="a-g3" style={{ marginTop: 12 }}>
          <label className="a-ch">
            <input type="radio" name="consult" value="in_person" defaultChecked />
            <AppIcon name="hospital" />
            {t(APP.inPerson, locale)}
          </label>
          <label className="a-ch">
            <input type="radio" name="consult" value="video" />
            <AppIcon name="video" />
            {t(APP.video, locale)}
          </label>
          <label className="a-ch">
            <input type="radio" name="consult" value="call" />
            <AppIcon name="phone" />
            {t(APP.call, locale)}
          </label>
        </div>

        {slots.length ? (
          <>
            {days.map((day, index) => {
              const label = dayLabel(day, locale);
              return (
                <details key={day} open={index === 0} style={{ marginTop: 10 }}>
                  <summary className="a-row" style={{ cursor: "pointer", listStyle: "none" }}>
                    <span className="a-datechip on" style={{ width: "auto", padding: "6px 12px" }}>
                      {label.dow} <b style={{ display: "inline", fontSize: 14 }}>{label.day}</b>
                    </span>
                  </summary>
                  <div className="a-g3" style={{ marginTop: 8 }}>
                    {slots
                      .filter((slot) => slot.date === day)
                      .map((slot) => (
                        <label key={`${slot.date}-${slot.start}`} className="a-slot">
                          <input type="radio" name="slot" value={`${slot.date}|${slot.start}|${slot.end}`} required />
                          {slot.start}
                        </label>
                      ))}
                  </div>
                </details>
              );
            })}
          </>
        ) : (
          <>
            <div className="a-chips" style={{ marginTop: 12 }}>
              {days.map((day, index) => {
                const label = dayLabel(day, locale);
                return (
                  <label key={day} className="a-datechip">
                    <input type="radio" name="date" value={day} defaultChecked={index === 0} />
                    {label.dow}
                    <b>{label.day}</b>
                  </label>
                );
              })}
            </div>
            <div className="a-g3" style={{ marginTop: 12 }}>
              {(["morning", "afternoon", "evening"] as const).map((window, index) => (
                <label key={window} className="a-slot">
                  <input type="radio" name="window" value={window} defaultChecked={index === 0} />
                  {t(APP.windows[window], locale)}
                </label>
              ))}
            </div>
            <p className="a-hint">
              <AppIcon name="clock" />
              <span>{t(APP.noSlots, locale)}</span>
            </p>
          </>
        )}
        <label className="a-field">
          <span>{t(APP.noteForDoctor, locale)}</span>
          <textarea className="a-input" name="note" placeholder={t(APP.optional, locale)} maxLength={400} />
        </label>
        <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
          <AppIcon name="check" />
          {t(APP.confirm, locale)}
        </button>
      </form>
    </Sheet>
  );
}

export function ChangeDoctorSheet({ app, section, peers }: { app: AppData; section: Section; peers: Pick<Doctor, "_id" | "name" | "designation" | "experienceYears">[] }) {
  const { locale } = app;
  return (
    <Sheet id="changedoc" title={t(APP.changeDoctor, locale)}>
      <form action={changeDoctorAction}>
        <Hidden app={app} section={section} />
        <p className="a-tiny a-muted" style={{ margin: "-6px 0 10px" }}>
          {t(APP.changeHint, locale)}
        </p>
        <div className="a-g3">
          {CHANGE_REASONS.map((reason) => (
            <label key={reason} className="a-ch">
              <input type="checkbox" name="reasons" value={reason} />
              <AppIcon name={REASON_ICON[reason]} />
              {t(APP.reasons[reason], locale)}
            </label>
          ))}
        </div>
        <div className="a-sec-h" style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: 14 }}>{t(APP.preferSomeone, locale)}</h3>
        </div>
        <div className="a-card a-list">
          <label className="a-li">
            <input type="radio" name="doctorId" value="" defaultChecked />
            <div className="a-t">
              <b>{t(APP.letShifainSuggest, locale)}</b>
            </div>
          </label>
          {peers.map((peer) => (
            <label key={peer._id} className="a-li">
              <input type="radio" name="doctorId" value={peer._id} />
              <span className="a-av" style={{ width: 34, height: 34, fontSize: 11, borderRadius: 10 }}>
                {initials(peer.name)}
              </span>
              <div className="a-t">
                <b>{peer.name}</b>
                <small>{[peer.designation, peer.experienceYears ? `${peer.experienceYears}+` : null].filter(Boolean).join(" · ")}</small>
              </div>
            </label>
          ))}
        </div>
        <label className="a-field">
          <span>{t(APP.anythingElse, locale)}</span>
          <textarea className="a-input" name="note" placeholder={t(APP.optional, locale)} maxLength={500} />
        </label>
        <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
          <AppIcon name="send" />
          {t(APP.sendRequest, locale)}
        </button>
      </form>
    </Sheet>
  );
}

export function AskSheet({ app, section }: { app: AppData; section: Section }) {
  const { locale } = app;
  return (
    <Sheet id="ask" title={t(APP.messageCareTeam, locale)}>
      <form action={messageAction}>
        <Hidden app={app} section={section} />
        <div className="a-g3">
          {(["doctor", "coordinator", "hotel"] as const).map((to, index) => (
            <label key={to} className="a-ch">
              <input type="radio" name="to" value={to} defaultChecked={index === 1} />
              <AppIcon name={to === "doctor" ? "stethoscope" : to === "hotel" ? "bed" : "user"} />
              {t(APP.messageTo[to], locale)}
            </label>
          ))}
        </div>
        <label className="a-field">
          <span>{t(APP.writeHere, locale)}</span>
          <textarea className="a-input" name="text" required maxLength={2000} />
        </label>
        <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
          <AppIcon name="send" />
          {t(APP.send, locale)}
        </button>
      </form>
    </Sheet>
  );
}

export function PickupSheet({ app, section }: { app: AppData; section: Section }) {
  const { locale, ctx } = app;
  return (
    <Sheet id="pickup" title={t(APP.pickupTitle, locale)}>
      <form action={rideAction} className="a-when">
        <Hidden app={app} section={section} />
        <div className="a-g3">
          {RIDE_PLACES.map((place, index) => (
            <label key={place} className="a-ch">
              <input type="radio" name="to" value={place} defaultChecked={index === 0} />
              <AppIcon name={PLACE_ICON[place]} />
              {t(APP.rideTo[place], locale)}
            </label>
          ))}
        </div>
        <div className="a-seg" style={{ marginTop: 12 }}>
          <label>
            <input type="radio" name="when" value="now" defaultChecked />
            {t(APP.now, locale)}
          </label>
          <label>
            <input type="radio" name="when" value="later" />
            {t(APP.later, locale)}
          </label>
        </div>
        <div className="a-later a-row" style={{ marginTop: 10 }}>
          <input className="a-input" type="date" name="date" min={app.today} defaultValue={app.today} aria-label={t(APP.date, locale)} />
          <input className="a-input" type="time" name="time" style={{ width: 130 }} aria-label={t(APP.time, locale)} />
        </div>
        <input className="a-input" name="address" maxLength={200} placeholder={t(APP.addressOptional, locale)} style={{ marginTop: 10 }} />
        <div className="a-row" style={{ marginTop: 12 }}>
          <span className="a-chip c-violet">
            <AppIcon name="users" />
          </span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 13 }}>{t(APP.passengers, locale)}</span>
          <Counter name="passengers" initial={1 + (app.record?.family ?? []).filter((member) => member.travelling).length} min={1} max={8} label={t(APP.passengers, locale)} />
        </div>
        <button className="a-btn a-btn-p a-w" style={{ marginTop: 14 }}>
          <AppIcon name="car" />
          {t(APP.sendToDriver, locale)}
          {ctx?.driver ? ` · ${ctx.driver.name.split(" ")[0]}` : ""}
        </button>
      </form>
    </Sheet>
  );
}

export function AddEventSheet({ app, section }: { app: AppData; section: Section }) {
  const { locale } = app;
  return (
    <Sheet id="addevent" title={t(APP.addToCalendar, locale)}>
      <form action={eventAction}>
        <Hidden app={app} section={section} />
        <div className="a-g3">
          {PERSONAL_EVENT_KINDS.map((kind, index) => (
            <label key={kind} className="a-ch">
              <input type="radio" name="kind" value={kind} defaultChecked={index === 0} />
              <AppIcon name={KIND_ICON[kind]} />
              {t(APP.eventKinds[kind], locale)}
            </label>
          ))}
        </div>
        <label className="a-field">
          <span>{t(APP.title, locale)}</span>
          <input className="a-input" name="title" required maxLength={120} />
        </label>
        <div className="a-row">
          <label className="a-field" style={{ flex: 1 }}>
            <span>{t(APP.date, locale)}</span>
            <input className="a-input" type="date" name="date" required defaultValue={app.today} />
          </label>
          <label className="a-field" style={{ width: 120 }}>
            <span>{t(APP.time, locale)}</span>
            <input className="a-input" type="time" name="time" />
          </label>
        </div>
        <label className="a-tog-label a-li" style={{ padding: "12px 0" }}>
          <div className="a-t">
            <b>{t(APP.tellCoordinator, locale)}</b>
            <small>{t(APP.tellCoordinatorHint, locale)}</small>
          </div>
          <input type="checkbox" name="tellDesk" defaultChecked />
          <span className="a-toggle-ui" />
        </label>
        <button className="a-btn a-btn-p a-w">
          <AppIcon name="check" />
          {t(APP.save, locale)}
        </button>
      </form>
    </Sheet>
  );
}

export function AddFamilySheet({ app, section }: { app: AppData; section: Section }) {
  const { locale } = app;
  return (
    <Sheet id="addfam" title={t(APP.addFamily, locale)}>
      <form action={familyAddAction}>
        <Hidden app={app} section={section} />
        <label className="a-field" style={{ marginTop: 0 }}>
          <span>{t(APP.name, locale)}</span>
          <input className="a-input" name="name" required maxLength={80} placeholder={t(APP.asInPassport, locale)} />
        </label>
        <div className="a-g3" style={{ marginTop: 12 }}>
          {FAMILY_RELATIONS.map((relation, index) => (
            <label key={relation} className="a-ch">
              <input type="radio" name="relation" value={relation} defaultChecked={index === 0} />
              {t(APP.relations[relation], locale)}
            </label>
          ))}
        </div>
        <div className="a-row">
          <label className="a-field" style={{ flex: 1 }}>
            <span>{t(APP.phone, locale)}</span>
            <input className="a-input" name="phone" inputMode="tel" placeholder="+" maxLength={30} />
          </label>
          <label className="a-field" style={{ flex: 1 }}>
            <span>{t(APP.email, locale)}</span>
            <input className="a-input" name="email" type="email" maxLength={200} />
          </label>
        </div>
        <label className="a-tog-label a-li" style={{ padding: "12px 0" }}>
          <div className="a-t">
            <b>{t(APP.travelling, locale)}</b>
            <small>{t(APP.travellingHint, locale)}</small>
          </div>
          <input type="checkbox" name="travelling" defaultChecked />
          <span className="a-toggle-ui" />
        </label>
        <div className="a-field" style={{ marginTop: 0 }}>
          <span>{t(APP.canSee, locale)}</span>
          <div className="a-g3">
            {FAMILY_ACCESS.map((access, index) => (
              <label key={access} className="a-ch">
                <input type="checkbox" name="access" value={access} defaultChecked={index < 2} />
                <AppIcon name={ACCESS_ICON[access]} />
                {t(APP.access[access], locale)}
              </label>
            ))}
          </div>
        </div>
        <p className="a-hint">
          <AppIcon name="shield" />
          <span>{t(APP.familyHint, locale)}</span>
        </p>
        <button className="a-btn a-btn-p a-w" style={{ marginTop: 14 }}>
          <AppIcon name="send" />
          {t(APP.sendInvite, locale)}
        </button>
      </form>
    </Sheet>
  );
}
