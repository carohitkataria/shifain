import Link from "next/link";
import {
  approveAction,
  publishAction,
  reinstateAction,
  sendBackAction,
  setActorAction,
  startReviewAction,
  submitForReviewAction,
  suspendAction,
} from "@/app/(admin)/admin/hospitals/onboarding-actions";
import type { Hospital } from "@/lib/catalogue";
import { isBookableRow, type HospitalOnboarding } from "@/lib/onboarding";
import {
  STATUS_LABEL,
  STEPS,
  accreditationStatus,
  blockers,
  inForce,
  type GateIssue,
  type OnboardingStatus,
} from "@/lib/onboarding-rules";
import { adminField, adminLabel } from "../../Panel";
import { StatusPill } from "../Wizard";

type Action = {
  action: (formData: FormData) => Promise<void>;
  label: string;
  tone: "primary" | "secondary" | "danger";
  disabled?: string | null;
  needsNote?: boolean;
};

export function ReviewStep({
  data,
  status,
  issues,
  actor,
}: {
  data: HospitalOnboarding;
  status: OnboardingStatus;
  issues: GateIssue[];
  actor: string;
}) {
  const { hospital } = data;
  const page = `/admin/hospitals/${encodeURIComponent(hospital._id)}`;
  const submitBlocks = blockers(issues, "submit");
  const publishBlocks = blockers(issues, "publish");
  const submittedBy = hospital.onboarding?.submittedBy ?? null;
  const selfReview = Boolean(actor && submittedBy && actor.trim().toLowerCase() === submittedBy.trim().toLowerCase());

  const actions: Record<OnboardingStatus, Action[]> = {
    draft: [
      {
        action: submitForReviewAction,
        label: "Submit for review",
        tone: "primary",
        disabled: submitBlocks.length ? `Fix the ${submitBlocks.length} blocking ${submitBlocks.length === 1 ? "issue" : "issues"} first.` : null,
      },
    ],
    submitted: [
      { action: startReviewAction, label: "Take into review", tone: "primary", disabled: selfReview ? "You submitted it; someone else reviews it." : null },
      { action: sendBackAction, label: "Send back to draft", tone: "secondary", needsNote: true },
    ],
    under_review: [
      {
        action: approveAction,
        label: "Approve",
        tone: "primary",
        disabled: selfReview ? "You submitted it; someone else approves it." : submitBlocks.length ? "Blocking issues remain." : null,
      },
      { action: sendBackAction, label: "Send back to draft", tone: "secondary", needsNote: true },
    ],
    approved: [
      { action: publishAction, label: "Publish to patients", tone: "primary", disabled: publishBlocks.length ? publishBlocks[0].message : null },
      { action: sendBackAction, label: "Send back to draft", tone: "secondary", needsNote: true },
    ],
    published: [{ action: suspendAction, label: "Suspend", tone: "danger", needsNote: true }],
    suspended: [{ action: reinstateAction, label: "Reinstate (back to approved)", tone: "secondary" }],
  };

  const records = hospital.accreditationRecords ?? [];
  const summary = [
    ["Accreditations in force", `${records.filter((record) => inForce(accreditationStatus(record))).length} of ${records.length}`],
    ["Specialties", String(hospital.specialtyCodes?.length ?? 0)],
    ["Doctors", String(data.doctors.length)],
    ["Doctors with a schedule", String(data.doctors.filter(({ schedules }) => schedules.some(isBookableRow)).length)],
    ["Procedures mapped", String(new Set(data.doctors.flatMap(({ procedureCodes }) => procedureCodes)).size)],
    ["Active packages", String(data.packages.filter((item) => item.status === "active").length)],
    ["Agreement", data.tieup?.status === "active" ? `Signed · ${data.tieup.agreementRef}` : "Not signed"],
  ];

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6" aria-labelledby="checks-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="checks-title" className="font-extrabold text-ink">
            Completeness and mapping checks
          </h3>
          <p className="text-sm text-ink-soft">
            <strong className={submitBlocks.length ? "text-red-700" : "text-leaf"}>{submitBlocks.length} blocking</strong> ·{" "}
            {issues.filter((issue) => issue.level === "warn" || issue.publishOnly).length} to note
          </p>
        </div>
        {issues.length === 0 ? (
          <p className="mt-4 rounded-xl bg-leaf/10 px-4 py-3 text-sm font-semibold text-leaf">Everything checks out.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {STEPS.filter((step) => issues.some((issue) => issue.step === step.key)).map((step) => (
              <li key={step.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink">{step.title}</p>
                  <Link href={`${page}?step=${step.key}`} className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-brand-tint">
                    Fix in {step.short}
                  </Link>
                </div>
                <ul className="mt-1.5 space-y-1.5">
                  {issues
                    .filter((issue) => issue.step === step.key)
                    .map((issue) => {
                      const hard = issue.level === "block" && !issue.publishOnly;
                      return (
                        <li key={issue.message} className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${hard ? "bg-red-50 text-red-800" : "bg-saffron/15 text-ink"}`}>
                          <span aria-hidden="true" className="font-bold">
                            {hard ? "✕" : "!"}
                          </span>
                          <span>
                            {issue.message}
                            {issue.publishOnly ? <span className="ml-1 font-semibold">(needed to publish)</span> : null}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="summary-title">
          <h3 id="summary-title" className="font-extrabold text-ink">
            Summary
          </h3>
          <dl className="mt-3 divide-y divide-line">
            {summary.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="text-right font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="decide-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="decide-title" className="font-extrabold text-ink">
              Status
            </h3>
            <StatusPill status={status} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Draft → Submitted → Under review → Approved → Published. The person who submits cannot approve.
          </p>

          <form action={setActorAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={hospital._id} />
            <label className="min-w-0 flex-1 basis-48">
              <span className={adminLabel}>You are</span>
              <input name="actor" defaultValue={actor} required placeholder="Your name" autoComplete="name" className={adminField} />
            </label>
            <button type="submit" className="btn btn-secondary min-h-11 !py-2.5 text-sm">
              {actor ? "Change" : "Save"}
            </button>
          </form>

          <form className="mt-4 space-y-3">
            <input type="hidden" name="id" value={hospital._id} />
            <label className="block">
              <span className={adminLabel}>Note for the history</span>
              <textarea name="note" rows={2} placeholder="What you checked, or what needs changing" className={adminField} />
            </label>
            <div className="flex flex-wrap gap-2">
              {actions[status].map((item) => (
                <div key={item.label} className="min-w-0">
                  <button
                    type="submit"
                    formAction={item.action}
                    disabled={Boolean(item.disabled) || !actor}
                    className={`btn min-h-11 !py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      item.tone === "primary" ? "btn-primary" : item.tone === "danger" ? "btn-secondary !text-red-700" : "btn-secondary"
                    }`}
                  >
                    {item.label}
                  </button>
                  {item.disabled ? <p className="mt-1 max-w-xs text-xs text-ink-soft">{item.disabled}</p> : null}
                  {item.needsNote ? <p className="mt-1 text-xs text-ink-muted">Needs a note.</p> : null}
                </div>
              ))}
            </div>
            {!actor ? <p className="text-sm font-semibold text-[#9a5a05]">Say who you are above to act on this hospital.</p> : null}
          </form>
        </section>
      </div>

      <History hospital={hospital} />
    </div>
  );
}

function History({ hospital }: { hospital: Hospital }) {
  const history = [...(hospital.onboarding?.history ?? [])].reverse();
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="history-title">
      <h3 id="history-title" className="font-extrabold text-ink">
        History
      </h3>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Nothing recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-3 border-l-2 border-line pl-4">
          {history.map((entry) => (
            <li key={`${entry.at}-${entry.status}`} className="relative">
              <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-white" aria-hidden="true" />
              <p className="text-sm text-ink">
                <strong>{STATUS_LABEL[entry.status]}</strong> · {entry.by}
                <span className="text-ink-soft"> · {new Date(entry.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
              </p>
              {entry.note ? <p className="mt-0.5 text-sm text-ink-soft">{entry.note}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
