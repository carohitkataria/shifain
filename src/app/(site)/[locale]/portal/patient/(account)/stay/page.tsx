import Link from "next/link";
import { AppShell, Hidden, SecHead, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { CopyButton, OpenSheet } from "@/components/patient-app/client";
import { AskSheet, PickupSheet } from "@/components/patient-app/sheets";
import { fmtDay } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { initials, loadApp, mapsHref, telHref, tgHref, waHref, type AppProps } from "@/lib/patient-app";
import { OPEN_RIDE, journeyOf, rideStep } from "@/lib/journey-rules";
import { t } from "@/lib/localize";
import { cancelRideAction } from "../../app-actions";

export const dynamic = "force-dynamic";

const NEARBY = [
  ["pharmacy", "pill", "pharmacy"],
  ["halal", "food", "halal restaurant"],
  ["prayer", "moon", "mosque"],
  ["forex", "cash", "currency exchange"],
  ["sim", "sim", "mobile phone shop"],
  ["laundry", "bed", "laundry"],
] as const;

/** Where the patient stays, the car they can call (and how far along it is), flights, and what is nearby. */
export default async function StayPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, ctx } = app;
  if (!record) {
    return (
      <AppShell app={app} section="stay">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const hotel = ctx?.hotel;
  const care = ctx?.care;
  const driver = ctx?.driver;
  const rides = [...(record.rides ?? [])].reverse();
  const live = rides.filter((ride) => OPEN_RIDE.includes(ride.status));
  const flightIn = journeyOf(record, "flight-in");
  const flightOut = journeyOf(record, "flight-out");
  const anchor = hotel?.address ?? [hotel?.name, hotel?.city].filter(Boolean).join(", ") ?? ctx?.hospital?.address ?? ctx?.hospital?.city ?? "";
  const near = hotel?.address || hotel?.name ? anchor : [ctx?.hospital?.name, ctx?.hospital?.city].filter(Boolean).join(", ");
  const isPatient = app.portal.viewer?.role === "patient";

  return (
    <AppShell app={app} section="stay" sheets={isPatient ? <><PickupSheet app={app} section="stay" /><AskSheet app={app} section="messages" /></> : null}>
      {hotel ? (
        <div className="a-card a-pad">
          <div className="a-row a-between">
            <span className="a-pill t-ok">{t(APP.confirmed, locale)}</span>
            {hotel.distanceKm ? <span className="a-tiny a-muted">{t(APP.toHospital(hotel.distanceKm), locale)}</span> : null}
          </div>
          <div className="a-person" style={{ marginTop: 10 }}>
            <span className="a-av c-teal">
              <AppIcon name="bed" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{hotel.name}</b>
              <div className="a-tiny a-muted">
                {[care?.room ? `${t(APP.room, locale)} ${care.room}` : null, hotel.address].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <div className="a-g3" style={{ marginTop: 12 }}>
            <div className="a-st">
              <span className="a-chip c-violet">
                <AppIcon name="key" />
              </span>
              {care?.checkIn ? fmtDay(care.checkIn, locale) : "—"}
              <em className="t-off">
                {t(APP.checkIn, locale)}
                {hotel.checkInTime ? ` · ${hotel.checkInTime}` : ""}
              </em>
            </div>
            <div className="a-st">
              <span className="a-chip c-violet">
                <AppIcon name="logout" />
              </span>
              {care?.checkOut ? fmtDay(care.checkOut, locale) : "—"}
              <em className="t-off">
                {t(APP.checkOut, locale)}
                {hotel.checkOutTime ? ` · ${hotel.checkOutTime}` : ""}
              </em>
            </div>
            {care?.wifi ? (
              <CopyButton value={care.wifi} className="a-st" copied={t(APP.copied, locale)}>
                <span className="a-chip c-violet">
                  <AppIcon name="wifi" />
                </span>
                {t(APP.wifi, locale)}
                <em className="t-sch">{t(APP.copy, locale)}</em>
              </CopyButton>
            ) : (
              <div className="a-st">
                <span className="a-chip c-off">
                  <AppIcon name="wifi" />
                </span>
                {t(APP.wifi, locale)}
                <em className="t-off">—</em>
              </div>
            )}
          </div>
          <div className="a-actions" style={{ marginTop: 12 }}>
            {hotel.phone ? (
              <a href={telHref(hotel.phone)} className="a-btn a-btn-t">
                <AppIcon name="phone" />
                {t(APP.desk, locale)}
              </a>
            ) : (
              <span />
            )}
            <a href={mapsHref(anchor)} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-t">
              <AppIcon name="nav" />
              {t(APP.directions, locale)}
            </a>
            <OpenSheet id="ask" className="a-btn a-btn-s">
              <AppIcon name="chat" />
              {t(APP.request, locale)}
            </OpenSheet>
          </div>
        </div>
      ) : (
        <p className="a-card a-pad a-tiny a-muted">{t(APP.noHotel, locale)}</p>
      )}

      <section className="a-sec">
        <SecHead icon="car" title={t(APP.yourVehicle, locale)} action={live.length ? <span className="a-pill t-sch">{t(APP.rideStatus[live[0].status], locale)}</span> : null} />
        <div className="a-card a-pad">
          {driver ? (
            <div className="a-person">
              <span className="a-av c-sky">{initials(driver.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{driver.name}</b>
                <div className="a-tiny a-muted">{[driver.vehicle?.model, driver.vehicle?.colour, driver.vehicle?.plate].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
          ) : (
            <p className="a-tiny a-muted">{t(APP.noDriver, locale)}</p>
          )}

          {live.map((ride) => (
            <div key={ride.id} className="a-card a-pad" style={{ marginTop: 12, boxShadow: "none", background: "var(--line-2)" }}>
              <div className="a-row a-between">
                <b style={{ fontSize: 13.5 }}>
                  {t(APP.ride, locale)} {t(APP.rideTo[ride.to], locale)}
                </b>
                <span className="a-tiny a-muted">{ride.when === "now" ? t(APP.now, locale) : `${fmtDay(ride.when, locale)} ${ride.when.slice(11)}`}</span>
              </div>
              <div className="a-progress" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={rideStep(ride.status)} aria-label={t(APP.rideStatus[ride.status], locale)}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <span key={index} className={index <= rideStep(ride.status) ? "on" : ""} />
                ))}
              </div>
              <div className="a-row a-between" style={{ marginTop: 6 }}>
                <span className="a-tiny" style={{ fontWeight: 700, color: "var(--primary)" }}>
                  {t(APP.rideStatus[ride.status], locale)}
                  {ride.note ? ` · ${ride.note}` : ""}
                </span>
                {isPatient && ride.status === "requested" ? (
                  <form action={cancelRideAction}>
                    <Hidden app={app} section="stay" />
                    <input type="hidden" name="id" value={ride.id} />
                    <button className="a-link" style={{ color: "var(--red)" }}>
                      {t(APP.cancel, locale)}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}

          {isPatient ? (
            <OpenSheet id="pickup" className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
              <AppIcon name="nav" />
              {t(APP.requestPickup, locale)}
            </OpenSheet>
          ) : null}
          {driver ? (
            <div className="a-actions" style={{ marginTop: 8 }}>
              {driver.phone ? (
                <a href={telHref(driver.phone)} className="a-btn a-btn-t">
                  <AppIcon name="phone" />
                  {t(APP.call, locale)}
                </a>
              ) : (
                <span />
              )}
              {driver.telegram || driver.phone ? (
                <a href={tgHref(driver.telegram ?? driver.phone!)} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-tg">
                  <AppIcon name="tg" />
                  {t(APP.telegram, locale)}
                </a>
              ) : (
                <span />
              )}
              {driver.whatsapp || driver.phone ? (
                <a href={waHref(driver.whatsapp ?? driver.phone!)} target="_blank" rel="noopener noreferrer" className="a-btn a-btn-wa">
                  <AppIcon name="wa" />
                  {t(APP.whatsapp, locale)}
                </a>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </div>
      </section>

      {flightIn || flightOut ? (
        <section className="a-sec">
          <SecHead icon="plane" title={t(APP.flights, locale)} />
          <ul className="a-card a-list">
            {[flightIn, flightOut].filter(Boolean).map((flight) => (
              <li key={flight!.id}>
                <Link href={href(app, "calendar", `day=${flight!.date ?? ""}&e=j-${flight!.id}`)} className="a-li a-tap">
                  <span className="a-chip c-sky">
                    <AppIcon name="plane" />
                  </span>
                  <span className="a-t">
                    <b>
                      {flight!.title}
                      {flight!.date ? ` · ${fmtDay(flight!.date, locale, true)}` : ""}
                      {flight!.time ? ` ${flight!.time}` : ""}
                    </b>
                    <small>{[flight!.place, flight!.detail].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className={`a-pill ${flight!.status === "booked" || flight!.status === "done" ? "t-ok" : "t-due"}`}>{t(flight!.status === "pending" ? APP.tileStatus.due : APP.tileStatus.sch, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {near ? (
        <section className="a-sec">
          <SecHead icon="pin" title={t(APP.nearby, locale)} />
          <div className="a-g3">
            {NEARBY.map(([key, icon, query]) => (
              <a key={key} href={mapsHref(`${query} near ${near}`)} target="_blank" rel="noopener noreferrer" className="a-tile">
                <AppIcon name={icon} />
                {t(APP.nearbyPlaces[key], locale)}
                <small>{t(APP.onMap, locale)}</small>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
