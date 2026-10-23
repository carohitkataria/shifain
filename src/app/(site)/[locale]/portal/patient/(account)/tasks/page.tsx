import Link from "next/link";
import { AppShell, Hidden, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { TodoRow } from "@/components/patient-app/rows";
import { fmtDay } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { t } from "@/lib/localize";
import { taskDoneAction } from "../../app-actions";

export const dynamic = "force-dynamic";

/** Everything open on the case: the patient's own first, then what the coordinator is doing. */
export default async function TasksPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record } = app;
  const showDone = app.query.f === "done";
  const mine = app.todo.filter((item) => item.owner === "patient");
  const desk = app.todo.filter((item) => item.owner === "desk");
  const done = (record?.tasks ?? []).filter((task) => task.status === "done" && task.owner === "patient").reverse();
  const isPatient = app.portal.viewer?.role === "patient";

  return (
    <AppShell app={app} section="tasks">
      <div className="a-chips">
        <Link href={href(app, "tasks")} className="a-fchip" aria-current={!showDone ? "page" : undefined}>
          {t(APP.openN(app.todo.length), locale)}
        </Link>
        <Link href={href(app, "tasks", "f=done")} className="a-fchip" aria-current={showDone ? "page" : undefined}>
          {t(APP.doneN(done.length), locale)}
        </Link>
      </div>
      {showDone ? (
        <ul className="a-card a-list" style={{ marginTop: 12 }}>
          {done.length === 0 ? (
            <li className="a-li">
              <span className="a-t">
                <small>—</small>
              </span>
            </li>
          ) : null}
          {done.map((task) => (
            <li key={task.id} className="a-li">
              <span className="a-chip c-green">
                <AppIcon name="check" />
              </span>
              <span className="a-t">
                <b>{task.title}</b>
                <small>{task.doneAt ? fmtDay(task.doneAt, locale) : ""}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="a-card a-list" style={{ marginTop: 12 }}>
            {mine.length === 0 ? (
              <li className="a-li">
                <span className="a-t">
                  <small>{t(APP.allClear, locale)}</small>
                </span>
              </li>
            ) : null}
            {mine.map((item) =>
              item.kind === "task" && isPatient ? (
                <li key={item.id} className="a-row" style={{ paddingRight: 10 }}>
                  <ul style={{ flex: 1, minWidth: 0 }}>
                    <TodoRow item={item} app={app} />
                  </ul>
                  <form action={taskDoneAction}>
                    <Hidden app={app} section="tasks" />
                    <input type="hidden" name="id" value={item.id.replace(/^task-/, "")} />
                    <button className="a-btn a-btn-t" style={{ minHeight: 34, padding: "0 10px" }} aria-label={`${t(APP.markDone, locale)}: ${item.title}`}>
                      <AppIcon name="check" />
                    </button>
                  </form>
                </li>
              ) : (
                <TodoRow key={item.id} item={item} app={app} />
              ),
            )}
          </ul>
          {desk.length ? (
            <section className="a-sec">
              <div className="a-sec-h">
                <h3>
                  <AppIcon name="clock" />
                  {t(APP.waitingOnDesk, locale)}
                </h3>
              </div>
              <ul className="a-card a-list">
                {desk.map((item) => (
                  <TodoRow key={item.id} item={item} app={app} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
