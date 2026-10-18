/**
 * The rules hospital onboarding runs on, with no database and no framework in
 * them: an accreditation's status from its dates, the review gate that decides
 * whether a hospital may go live, and the bookable slots a weekly rota yields.
 * Kept pure so the admin pages, the server actions and the tests all agree.
 */

// ------------------------------------------------------------------ lifecycle

/** Maker–checker: the relationship manager drafts and submits; someone else reviews and approves. */
export const ONBOARDING_STATUSES = ["draft", "submitted", "under_review", "approved", "published", "suspended"] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const STATUS_LABEL: Record<OnboardingStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  published: "Published",
  suspended: "Suspended",
};

export const STEPS = [
  { key: "basics", title: "Hospital basics", short: "Basics" },
  { key: "infrastructure", title: "Infrastructure & scale", short: "Infrastructure" },
  { key: "accreditations", title: "Accreditations", short: "Accreditations" },
  { key: "specialties", title: "Specialties & centres of excellence", short: "Specialties" },
  { key: "facilities", title: "Facilities & services", short: "Facilities" },
  { key: "doctors", title: "Doctors", short: "Doctors" },
  { key: "packages", title: "Packages", short: "Packages" },
  { key: "media", title: "Media & gallery", short: "Media" },
  { key: "commercials", title: "Commercials", short: "Commercials" },
  { key: "review", title: "Review & submit", short: "Review" },
] as const;
export type StepKey = (typeof STEPS)[number]["key"];

export const isStep = (value: string | undefined): value is StepKey => STEPS.some((step) => step.key === value);

// ------------------------------------------------------------- accreditations

export type AccreditationRecord = {
  id: string;
  /** A code from the accreditation master, e.g. "JCI" or "NABH". */
  code: string;
  certificateNo: string | null;
  validFrom: string | null;
  validTo: string | null;
  /** The certificate itself, held in media storage. */
  fileId: string | null;
  /** A fact we were told, not a status we chose: the body withdrew it. */
  revoked: boolean;
};

export type AccreditationStatus = "valid" | "expiring" | "expired" | "revoked" | "incomplete";

/** Within this many days of expiry an accreditation is flagged, though still valid. */
export const EXPIRING_DAYS = 90;

const DAY_MS = 86_400_000;
const dayOf = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const isIsoDate = (value: string | null | undefined): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

/** Derived, never hand-set: patients are told to check exactly this. */
export function accreditationStatus(
  record: Pick<AccreditationRecord, "validFrom" | "validTo" | "revoked">,
  today: string = new Date().toISOString().slice(0, 10),
): AccreditationStatus {
  if (record.revoked) return "revoked";
  if (!isIsoDate(record.validTo) || !isIsoDate(record.validFrom)) return "incomplete";
  const now = dayOf(today);
  if (dayOf(record.validTo) < now) return "expired";
  if (dayOf(record.validFrom) > now) return "incomplete";
  return dayOf(record.validTo) - now <= EXPIRING_DAYS * DAY_MS ? "expiring" : "valid";
}

/** Valid and expiring both still count: the certificate is in force today. */
export const inForce = (status: AccreditationStatus) => status === "valid" || status === "expiring";

export const ACCREDITATION_STATUS_LABEL: Record<AccreditationStatus, string> = {
  valid: "Valid",
  expiring: "Expiring",
  expired: "Expired",
  revoked: "Revoked",
  incomplete: "Dates missing",
};

// ------------------------------------------------------------------ the gate

export type GateIssue = {
  step: StepKey;
  /** "block" stops submission (and publishing); "warn" is worth fixing but does not. */
  level: "block" | "warn";
  message: string;
  /** Only blocks at the last step, publishing; for review it is a warning. */
  publishOnly?: boolean;
};

export type GateInput = {
  hospital: {
    name: string | null;
    city: string | null;
    country: string | null;
    hospitalType: string | null;
    specialtyCodes: string[];
    accreditations: Pick<AccreditationRecord, "code" | "validFrom" | "validTo" | "revoked">[];
  };
  doctors: {
    name: string;
    status: string;
    consentToList: boolean;
    procedureCount: number;
    /** Weekly rows at this hospital. */
    scheduleCount: number;
  }[];
  packages: { name: string; status: string; procedureInScope: boolean; procedureName: string }[];
  commercial: { agreementActive: boolean; agreementRef: string | null };
  today?: string;
};

/**
 * What stands between this hospital and patients. Each issue names the step it
 * belongs to, so the review page can put it next to the mapping it is about.
 */
export function reviewGate(input: GateInput): GateIssue[] {
  const issues: GateIssue[] = [];
  const { hospital } = input;

  const missing = [
    ["name", hospital.name],
    ["city", hospital.city],
    ["country", hospital.country],
    ["hospital type", hospital.hospitalType],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([label]) => label);
  if (missing.length) issues.push({ step: "basics", level: "block", message: `Missing ${missing.join(", ")}.` });

  const statuses = hospital.accreditations.map((record) => ({ code: record.code, status: accreditationStatus(record, input.today) }));
  if (!statuses.some((item) => inForce(item.status))) {
    issues.push({
      step: "accreditations",
      level: "block",
      message: hospital.accreditations.length
        ? "No accreditation is in force — every one is expired, revoked or missing its dates."
        : "No accreditation added. At least one valid accreditation is needed.",
    });
  }
  for (const item of statuses) {
    if (item.status === "expired" || item.status === "revoked") {
      issues.push({ step: "accreditations", level: "warn", message: `${item.code} is ${item.status}; it is not shown to patients.` });
    } else if (item.status === "expiring") {
      issues.push({ step: "accreditations", level: "warn", message: `${item.code} expires within ${EXPIRING_DAYS} days.` });
    } else if (item.status === "incomplete") {
      issues.push({ step: "accreditations", level: "warn", message: `${item.code} needs valid-from and valid-to dates.` });
    }
  }

  if (hospital.specialtyCodes.length === 0) {
    issues.push({ step: "specialties", level: "block", message: "No specialties mapped, so no case can be matched here." });
  }

  const active = input.doctors.filter((doctor) => doctor.status !== "inactive");
  if (!active.some((doctor) => doctor.scheduleCount > 0)) {
    issues.push({ step: "doctors", level: "block", message: "No doctor has a schedule at this hospital yet." });
  }
  for (const doctor of active) {
    if (doctor.procedureCount === 0) {
      issues.push({ step: "doctors", level: "block", message: `${doctor.name} is mapped to no procedure.` });
    }
    if (doctor.scheduleCount === 0) {
      issues.push({ step: "doctors", level: "warn", message: `${doctor.name} has no schedule here.` });
    }
    if (!doctor.consentToList) {
      issues.push({ step: "doctors", level: "warn", message: `${doctor.name} has not agreed to be listed, so stays unnamed to patients.` });
    }
  }

  for (const item of input.packages) {
    if (!item.procedureInScope) {
      issues.push({
        step: "packages",
        level: "block",
        message: `“${item.name}”: ${item.procedureName || "its procedure"} is not in this hospital's specialties.`,
      });
    } else if (item.status === "draft") {
      issues.push({ step: "packages", level: "warn", message: `“${item.name}” is still a draft and will not be shown.` });
    }
  }

  if (!input.commercial.agreementActive || !input.commercial.agreementRef) {
    issues.push({
      step: "commercials",
      level: "block",
      publishOnly: true,
      message: "No signed agreement with a reference. A hospital is only published against a signed tie-up.",
    });
  }

  return issues;
}

/** What stops this action. Submitting ignores the publish-only checks; publishing does not. */
export function blockers(issues: GateIssue[], action: "submit" | "publish"): GateIssue[] {
  return issues.filter((issue) => issue.level === "block" && (action === "publish" || !issue.publishOnly));
}

// -------------------------------------------------------------------- slots

export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
export type ConsultType = "in_person" | "video" | "both";

export type WeeklyRow = {
  hospitalId: string;
  day: WeekdayKey | null;
  from: string | null;
  to: string | null;
  slotMinutes: number | null;
  consultType?: ConsultType | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export type BlackoutDate = { hospitalId: string | null; date: string; available: boolean };
export type BookedSlot = { hospitalId: string; date: string; start: string; status: string };
export type Slot = { hospitalId: string; date: string; start: string; end: string; consultType: ConsultType };

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (total: number) => `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const isTime = (value: string | null | undefined): value is string => Boolean(value && /^\d{2}:\d{2}$/.test(value));

/**
 * Bookable slots, worked out rather than stored: the weekly rota laid across a
 * window of dates, less blackout days and anything already booked.
 */
export function computeSlots(input: {
  schedules: WeeklyRow[];
  blackouts: BlackoutDate[];
  booked: BookedSlot[];
  /** YYYY-MM-DD */
  from: string;
  days: number;
}): Slot[] {
  const taken = new Set(
    input.booked
      .filter((item) => item.status === "requested" || item.status === "confirmed")
      .map((item) => `${item.hospitalId}|${item.date}|${item.start}`),
  );
  const slots: Slot[] = [];
  const start = dayOf(input.from);

  for (let offset = 0; offset < input.days; offset += 1) {
    const at = new Date(start + offset * DAY_MS);
    const date = at.toISOString().slice(0, 10);
    const weekday = WEEKDAY_KEYS[at.getUTCDay()];

    for (const row of input.schedules) {
      if (row.day !== weekday || !isTime(row.from) || !isTime(row.to) || !row.slotMinutes || row.slotMinutes < 5) continue;
      if (isIsoDate(row.validFrom) && date < row.validFrom) continue;
      if (isIsoDate(row.validTo) && date > row.validTo) continue;
      const closed = input.blackouts.some(
        (item) => !item.available && item.date === date && (item.hospitalId === null || item.hospitalId === row.hospitalId),
      );
      if (closed) continue;

      for (let t = minutes(row.from); t + row.slotMinutes <= minutes(row.to); t += row.slotMinutes) {
        const begin = hhmm(t);
        if (taken.has(`${row.hospitalId}|${date}|${begin}`)) continue;
        slots.push({ hospitalId: row.hospitalId, date, start: begin, end: hhmm(t + row.slotMinutes), consultType: row.consultType ?? "in_person" });
      }
    }
  }
  return slots.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
