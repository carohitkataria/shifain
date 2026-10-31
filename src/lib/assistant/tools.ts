import "server-only";
import { readOr } from "../db";
import { listSpecialties, listTreatments, priceBandsFor, publishedDoctors, publishedHospitals, type Hospital } from "../catalogue";
import { getCase } from "../cases";
import { LEVEL_RANK, type AccessLevel } from "../access-levels";
import { matchTreatment } from "../voice/treatments";
import { STATUS_WORDS } from "../voice/command-copy";
import {
  TOOL_DEFINITIONS,
  bandRow,
  doctorsAt,
  hospitalsFor,
  maskReference,
  matchSpecialty,
  type ToolLink,
  type ToolName,
  type ToolSchedule,
} from "./tool-rules";

/**
 * Runs a data tool the AI asked for. What the AI may not choose comes from
 * here: the hospital is the one this conversation is about, the case is this
 * conversation's own, and the level is checked before anything is read.
 */
export type ToolContext = {
  /** The hospital the patient chose or named, kept on the conversation. */
  hospitalId: string | null;
  /** The case this conversation may see, if any. */
  caseReference: string | null;
  level: AccessLevel;
};

const NEXT_STEP: Record<string, string> = {
  new: "A coordinator reviews the case and starts the plan.",
  planning: "The free plan is being prepared.",
  planned: "A coordinator goes through the draft plan with the patient and asks the hospital to confirm.",
  "plan-failed": "A coordinator is preparing the plan by hand.",
  confirmed: "Travel, visa and stay are arranged with the coordinator.",
  closed: "Nothing more is pending.",
};

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<Record<string, unknown>> {
  const tool = TOOL_DEFINITIONS.find((item) => item.name === name);
  if (!tool) return { error: "No such tool." };
  if (LEVEL_RANK[ctx.level] < LEVEL_RANK[tool.level]) return { error: "Not available in this conversation." };
  const text = (key: string) => (typeof args[key] === "string" ? (args[key] as string).slice(0, 80) : "");

  switch (name as ToolName) {
    case "list_doctors": {
      if (!ctx.hospitalId) return { error: "No hospital chosen yet. Ask which hospital they are interested in, or use list_hospitals." };
      const [hospitals, doctors, specialties, links, schedules] = await Promise.all([
        publishedHospitals({ limit: 200 }),
        publishedDoctors(500),
        listSpecialties(),
        readOr<ToolLink[]>([], (db) => db.collection<ToolLink>("hospital_doctor_map").find({ hospitalId: ctx.hospitalId! }).toArray()),
        readOr<ToolSchedule[]>([], (db) => db.collection<ToolSchedule>("doctor_schedules").find({ hospitalId: ctx.hospitalId! }).toArray()),
      ]);
      const hospital = hospitals.find((item) => item._id === ctx.hospitalId) ?? null;
      const rows = doctorsAt({ hospital, doctors, links, schedules, specialties, specialty: text("specialty"), language: text("language") });
      return { hospital: hospital?.name ?? null, doctors: rows };
    }
    case "list_hospitals": {
      const [hospitals, treatments, specialties] = await Promise.all([publishedHospitals({ limit: 200 }), listTreatments(), listSpecialties()]);
      const asked = text("treatment");
      const treatment = asked ? matchTreatment(asked, treatments) : null;
      const codes = treatment ? [treatment.primarySpecialtyCode] : asked ? matchSpecialty(asked, specialties) : [];
      return { hospitals: hospitalsFor({ hospitals: hospitals as Hospital[], city: text("city"), specialtyCodes: codes }) };
    }
    case "price_band": {
      const treatments = await listTreatments();
      const treatment = matchTreatment(text("treatment"), treatments);
      if (!treatment) return { error: "No starting price on file for that treatment; the free plan gives the estimate." };
      const [band] = await priceBandsFor([treatment._id]);
      const row = bandRow(treatment.name?.en ?? treatment._id, band ?? null);
      return row ? { price: row } : { error: "No starting price on file for that treatment; the free plan gives the estimate." };
    }
    case "case_status": {
      if (!ctx.caseReference) return { error: "This conversation has no case." };
      const record = await getCase(ctx.caseReference).catch(() => null);
      if (!record) return { error: "The case could not be read just now." };
      return { case: { stage: STATUS_WORDS[record.status]?.en ?? record.status, nextStep: NEXT_STEP[record.status] ?? "", reference: maskReference(record._id) } };
    }
  }
  return { error: "No such tool." };
}
