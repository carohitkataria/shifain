import "server-only";
import crypto from "node:crypto";
import { INTAKE_QUESTIONS, type IntakeAnswers, type PlanReport } from "./ai/plan";
import { MAX_REPORT_BYTES, type ReportUpload } from "./reports";
import type { CaseReport, IntakeRoute } from "./cases";

export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export { MAX_REPORT_BYTES as MAX_FILE_BYTES };

/** The file types the planner can actually read. */
const READABLE = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/;

export type Intake = {
  route: IntakeRoute;
  statedNeed: string;
  description: string | null;
  answers: IntakeAnswers | null;
  /** Metadata to keep on the case. */
  meta: CaseReport[];
  /** Bytes to store for thirty days. */
  uploads: ReportUpload[];
  /** Base64 to hand the planner. */
  forPlanner: PlanReport[];
  tooLarge: boolean;
};

/**
 * Reads whichever route the patient took. A patient who will not or cannot
 * share reports still gets a plan — they describe the problem, or answer the
 * standard questions — so this never insists on a file.
 */
export async function readIntake(form: FormData): Promise<Intake> {
  const statedNeed = String(form.get("treatment") ?? form.get("need") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;

  const answers: IntakeAnswers = {};
  for (const { id } of INTAKE_QUESTIONS) {
    const value = String(form.get(`answer.${id}`) ?? "").trim();
    if (value) answers[id] = value;
  }
  const hasAnswers = Object.keys(answers).length > 0;

  const files = form
    .getAll("reports")
    .filter((value): value is File => value instanceof File && value.size > 0);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  // Each file must also fit what is stored (MAX_REPORT_BYTES): a bigger one would reach the
  // planner but never be kept for the coordinator, so it is refused up front instead.
  if (files.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES || files.some((file) => file.size > MAX_REPORT_BYTES)) {
    return {
      route: "reports",
      statedNeed,
      description,
      answers: hasAnswers ? answers : null,
      meta: [],
      uploads: [],
      forPlanner: [],
      tooLarge: true,
    };
  }

  const meta: CaseReport[] = [];
  const uploads: ReportUpload[] = [];
  const forPlanner: PlanReport[] = [];

  for (const file of files) {
    const id = crypto.randomBytes(6).toString("hex");
    const mediaType = READABLE.test(file.type) ? file.type : "application/octet-stream";
    const body = Buffer.from(await file.arrayBuffer());

    meta.push({ id, filename: file.name, mediaType, bytes: body.byteLength });
    if (body.byteLength <= MAX_REPORT_BYTES) {
      uploads.push({ id, filename: file.name, mediaType, body });
    }
    forPlanner.push({
      filename: file.name,
      mediaType,
      // Only a type the planner can read is worth sending; the rest are still
      // stored and still reach a coordinator.
      data: READABLE.test(file.type) ? body.toString("base64") : "",
    });
  }

  const route: IntakeRoute =
    files.length > 0 ? "reports" : hasAnswers ? "questions" : "description";

  return {
    route,
    statedNeed,
    description,
    answers: hasAnswers ? answers : null,
    meta,
    uploads,
    forPlanner,
    tooLarge: false,
  };
}

/** Whether there is enough here to be worth planning from. */
export function hasSomethingToPlanFrom(intake: Intake): boolean {
  return (
    intake.forPlanner.length > 0 ||
    Boolean(intake.description) ||
    Boolean(intake.answers) ||
    Boolean(intake.statedNeed)
  );
}
