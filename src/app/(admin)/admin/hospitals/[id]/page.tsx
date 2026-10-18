import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice } from "@/components/admin/AdminShell";
import { Warn } from "@/components/admin/Panel";
import { StatusPill, StepHeading, StepIssues, Stepper, type StepState } from "@/components/admin/onboarding/Wizard";
import {
  AccreditationsStep,
  BasicsStep,
  FacilitiesStep,
  InfrastructureStep,
  SpecialtiesStep,
} from "@/components/admin/onboarding/steps/ProfileSteps";
import { CommercialsStep, DoctorsStep, MediaStep, PackagesStep } from "@/components/admin/onboarding/steps/NetworkSteps";
import { ReviewStep } from "@/components/admin/onboarding/steps/ReviewStep";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import type { Doctor } from "@/lib/catalogue";
import { currentActor, gateFor, loadHospitalOnboarding, loadMasters, statusOf } from "@/lib/onboarding";
import { STEPS, isStep, type StepKey } from "@/lib/onboarding-rules";
import { mediaInfo } from "@/lib/media";

export const dynamic = "force-dynamic";

const LEADS: Record<StepKey, string> = {
  basics: "Who the hospital is, where it is, how far from the airport, and who runs its international desk.",
  infrastructure: "Beds, theatres and clinical capabilities — the numbers patients look for and the planner matches on.",
  accreditations: "Each certificate with its validity. Status is worked out from the dates, never typed.",
  specialties: "What the hospital offers, its centres of excellence and the specialties each one covers.",
  facilities: "What an international patient can count on, and the languages spoken.",
  doctors: "The panel: search, filter and act on several at once. Open a doctor for their full profile, procedures and schedule.",
  packages: "Bundled treatments, each tied to a specialty and procedure the hospital actually offers.",
  media: "Logo, cover, gallery and virtual tour.",
  commercials: "Commission, payment terms and the signed agreement.",
  review: "Every check in one place, then submit for an approver. Nothing reaches patients until it is published.",
};

export default async function HospitalOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string; saved?: string; error?: string; q?: string; spec?: string; count?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  if (!isDatabaseConfigured()) notFound();

  const { id } = await params;
  const query = await searchParams;
  const step: StepKey = isStep(query.step) ? query.step : "basics";

  const [data, masters, actor] = await Promise.all([loadHospitalOnboarding(id), loadMasters(), currentActor()]);
  if (!data) notFound();
  const { hospital } = data;
  const status = statusOf(hospital);
  const issues = gateFor(data, masters);

  const filled: Record<StepKey, boolean> = {
    basics: Boolean(hospital.name && hospital.city && hospital.country && hospital.hospitalType),
    infrastructure: hospital.beds !== null && hospital.beds !== undefined,
    accreditations: (hospital.accreditationRecords ?? []).length > 0,
    specialties: (hospital.specialtyCodes ?? []).length > 0,
    facilities: Boolean(hospital.facilities?.length || hospital.languages?.length),
    doctors: data.doctors.length > 0,
    packages: data.packages.length > 0,
    media: Boolean(hospital.media?.logoId || hospital.media?.coverId || hospital.media?.galleryIds.length),
    commercials: data.tieup?.status === "active",
    review: status !== "draft",
  };
  // A step not started is simply to do; only a started step can be "needs attention".
  const states = Object.fromEntries(
    STEPS.map(({ key }) => [
      key,
      !filled[key] ? "todo" : issues.some((issue) => issue.step === key && issue.level === "block" && !issue.publishOnly) ? "issues" : "done",
    ]),
  ) as Record<StepKey, StepState>;

  const base = `/admin/hospitals/${encodeURIComponent(id)}`;
  const index = STEPS.findIndex((item) => item.key === step);
  const back = index > 0 ? `${base}?step=${STEPS[index - 1].key}` : null;
  const next = `${base}?step=${STEPS[Math.min(index + 1, STEPS.length - 1)].key}`;
  const current = STEPS[index];

  const db = await getDb();
  const fileIds = [
    hospital.media?.logoId,
    hospital.media?.coverId,
    ...(hospital.media?.galleryIds ?? []),
    data.tieup?.agreementFileId,
  ].filter((value): value is string => Boolean(value));
  const [files, others] = await Promise.all([
    step === "media" || step === "commercials" ? mediaInfo(fileIds) : Promise.resolve([]),
    step === "doctors"
      ? db
          .collection<Doctor>("doctors")
          .find({ _id: { $nin: data.doctors.map(({ doctor }) => doctor._id) } }, { projection: { name: 1 } })
          .sort({ name: 1 })
          .limit(500)
          .toArray()
      : Promise.resolve([]),
  ]);

  const savedNote =
    query.saved === "created"
      ? "Hospital added as a draft. Work through the steps; save as often as you like."
      : query.saved === "status"
      ? "Status updated."
      : query.saved === "bulk"
        ? `Updated ${query.count ?? ""} ${query.count === "1" ? "doctor" : "doctors"}.`
        : query.saved
          ? `${STEPS.find((item) => item.key === query.saved)?.short ?? "Changes"} saved.`
          : null;

  return (
    <AdminShell
      title={hospital.name}
      subtitle={`${[hospital.city, hospital.state, hospital.country].filter(Boolean).join(", ")}${hospital.assignedRm ? ` · RM ${hospital.assignedRm}` : ""}`}
      action={<StatusPill status={status} />}
      fullWidth
    >
      <Link href="/admin/hospitals" className="mb-5 inline-block text-sm font-bold text-brand hover:underline">
        &larr; All hospitals
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Stepper base={base} current={step} states={states} />
        </aside>

        <div className="min-w-0">
          <StepHeading title={`${index + 1}. ${current.title}`} lead={LEADS[step]} />
          {savedNote ? <Notice>{savedNote}</Notice> : null}
          {query.error ? <Warn>{query.error}</Warn> : null}
          {status === "submitted" || status === "under_review" || status === "approved" ? (
            step !== "review" ? (
              <p className="mb-5 rounded-lg bg-brand-tint px-3.5 py-2.5 text-sm font-semibold text-brand-deep">
                This hospital is {status.replace("_", " ")}. Saving a change sends it back to draft for another review.
              </p>
            ) : null
          ) : null}
          {step !== "review" ? <StepIssues issues={issues.filter((issue) => issue.step === step)} started={filled[step]} /> : null}

          {step === "basics" ? <BasicsStep hospital={hospital} masters={masters} back={back} /> : null}
          {step === "infrastructure" ? <InfrastructureStep hospital={hospital} masters={masters} back={back} /> : null}
          {step === "accreditations" ? <AccreditationsStep hospital={hospital} back={back} /> : null}
          {step === "specialties" ? (
            <SpecialtiesStep hospital={hospital} masters={masters} coe={data.coe} departmentBeds={data.departmentBeds} back={back} />
          ) : null}
          {step === "facilities" ? <FacilitiesStep hospital={hospital} back={back} /> : null}
          {step === "doctors" ? (
            <DoctorsStep hospital={hospital} doctors={data.doctors} others={others} masters={masters} query={query} back={back} next={next} />
          ) : null}
          {step === "packages" ? <PackagesStep hospital={hospital} packages={data.packages} masters={masters} back={back} /> : null}
          {step === "media" ? <MediaStep hospital={hospital} files={files} back={back} /> : null}
          {step === "commercials" ? <CommercialsStep hospital={hospital} tieup={data.tieup} files={files} back={back} /> : null}
          {step === "review" ? <ReviewStep data={data} status={status} issues={issues} actor={actor} /> : null}
        </div>
      </div>
    </AdminShell>
  );
}
