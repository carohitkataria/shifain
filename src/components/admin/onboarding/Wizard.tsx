import Link from "next/link";
import { AdminIcon } from "../AdminIcon";
import { saveStepAndContinueAction } from "@/app/(admin)/admin/hospitals/onboarding-actions";
import { KeepActiveVisible } from "./KeepActiveVisible";
import { STATUS_LABEL, STEPS, type GateIssue, type OnboardingStatus, type StepKey } from "@/lib/onboarding-rules";

const STATUS_TONE: Record<OnboardingStatus, string> = {
  draft: "bg-surface-muted text-ink-soft ring-line",
  submitted: "bg-brand-tint text-brand-deep ring-brand/20",
  under_review: "bg-saffron/15 text-[#9a5a05] ring-saffron/30",
  approved: "bg-leaf/10 text-leaf ring-leaf/25",
  published: "bg-leaf text-white ring-leaf",
  suspended: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusPill({ status }: { status: OnboardingStatus }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export type StepState = "done" | "issues" | "todo";

/**
 * The ten steps down the side (a scrollable strip on small screens), each
 * marked done, needing attention or not started, with the current one lit.
 */
export function Stepper({
  base,
  current,
  states,
}: {
  base: string;
  current: StepKey;
  states: Record<StepKey, StepState>;
}) {
  const index = STEPS.findIndex((step) => step.key === current);
  const done = STEPS.filter((step) => states[step.key] === "done").length;
  return (
    <nav aria-label="Onboarding steps" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-ink">
          Step {index + 1} of {STEPS.length}
        </span>
        <span className="text-ink-soft">{done} complete</span>
      </div>
      <div
        className="mb-4 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Steps complete"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={done}
      >
        <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(done / STEPS.length) * 100}%` }} />
      </div>
      <ol className="relative -mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible">
        {STEPS.map((step, position) => {
          const active = step.key === current;
          const state = states[step.key];
          return (
            <li key={step.key} className="shrink-0">
              <Link
                href={`${base}?step=${step.key}`}
                aria-current={active ? "step" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
                  active ? "bg-white font-bold text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:bg-white/70 hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${
                    state === "done"
                      ? "bg-leaf text-white"
                      : state === "issues"
                        ? "bg-saffron/20 text-[#9a5a05]"
                        : active
                          ? "bg-brand text-white"
                          : "bg-white text-ink-soft ring-1 ring-line"
                  }`}
                  aria-hidden="true"
                >
                  {state === "done" ? "✓" : state === "issues" ? "!" : position + 1}
                </span>
                <span className="whitespace-nowrap">{step.short}</span>
                <span className="sr-only">{state === "done" ? "(complete)" : state === "issues" ? "(needs attention)" : ""}</span>
              </Link>
            </li>
          );
        })}
      </ol>
      <KeepActiveVisible />
    </nav>
  );
}

/** A step's heading and its one-line purpose. */
export function StepHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{lead}</p>
    </div>
  );
}

/** Save draft / save and continue, pinned to the bottom of the step on every screen size. */
export function StepActions({ form, back, last }: { form: string; back: string | null; last?: boolean }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-between gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
      {back ? (
        <Link
          href={back}
          aria-label="Back to the previous step"
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-bold text-ink-soft hover:bg-surface-muted hover:text-ink sm:px-4"
        >
          <AdminIcon name="chevron" className="h-4 w-4 rotate-90" />
          <span className="hidden sm:inline">Back</span>
        </Link>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button type="submit" form={form} className="btn btn-secondary min-h-11 !px-4 !py-2.5 text-sm">
          Save draft
        </button>
        {last ? null : (
          <button type="submit" form={form} formAction={saveStepAndContinueAction} className="btn btn-primary min-h-11 !px-4 !py-2.5 text-sm">
            Save and continue
          </button>
        )}
      </div>
    </div>
  );
}

/** Issues the gate raised for this step, shown at its top so they are fixed where they arise. */
export function StepIssues({ issues, started }: { issues: GateIssue[]; started: boolean }) {
  if (issues.length === 0) return null;
  // Before a step is started its checks read as what to do, not as errors.
  const tone = (issue: GateIssue) =>
    !started ? "bg-brand-tint text-brand-deep" : issue.level === "block" && !issue.publishOnly ? "bg-red-50 text-red-800" : "bg-saffron/15 text-ink";
  const mark = (issue: GateIssue) => (!started ? "→" : issue.level === "block" && !issue.publishOnly ? "✕" : "!");
  return (
    <ul className="mb-5 space-y-1.5" aria-label="Checks for this step">
      {issues.map((issue) => (
        <li key={issue.message} className={`flex gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tone(issue)}`}>
          <span aria-hidden="true" className="font-bold">
            {mark(issue)}
          </span>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
