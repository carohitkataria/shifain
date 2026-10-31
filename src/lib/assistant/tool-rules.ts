/**
 * The assistant's data tools, as rules: what each tool is, who may use it, and
 * exactly which fields it returns. The AI calls a tool by name; the server
 * fills in what the AI must not choose (the hospital, the case), runs it on
 * live catalogue data and hands back only the fields listed here — never a
 * phone number, an email, another patient's data, or anything unpublished.
 *
 * Pure, so the rules are tested without a database (scripts/test/tools.test.mts).
 */
import type { AccessLevel } from "../access-levels";

export type ToolName = "list_doctors" | "list_hospitals" | "price_band" | "case_status";

export type ToolDefinition = {
  name: ToolName;
  description: string;
  level: AccessLevel;
  /** Only strings: what the AI may pass. Everything else comes from the server. */
  parameters: Record<string, string>;
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "list_doctors",
    description:
      "Doctors at the hospital the patient has chosen (the server knows which; you cannot pick another). Returns name, specialty, languages and the days they see patients. Call it when the patient asks which doctors there are, or for a kind of specialist.",
    level: "public",
    parameters: {
      specialty: "The kind of doctor asked for, in English (e.g. cardiologist, orthopaedics). Empty for all.",
      language: "A language the patient wants the doctor to speak (e.g. Russian). Empty for any.",
    },
  },
  {
    name: "list_hospitals",
    description: "Hospitals ShifaIn works with (published and under agreement). Returns name, city and accreditation. Call it when the patient asks where they could be treated.",
    level: "public",
    parameters: {
      city: "An Indian city, if the patient named one. Empty for all.",
      treatment: "The treatment or specialty, in English, if known. Empty for all.",
    },
  },
  {
    name: "price_band",
    description: "The indicative starting price range in USD for a treatment. Always say it is indicative and that the free plan gives the itemised estimate the hospital confirms.",
    level: "public",
    parameters: {
      treatment: "The treatment, in English (e.g. knee replacement).",
      city: "An Indian city, if named. Empty otherwise.",
    },
  },
  {
    name: "case_status",
    description: "The stage and next step of the patient's own case in this conversation, with the case number masked. Takes nothing: the server knows the case.",
    level: "conversation",
    parameters: {},
  },
];

export const MAX_TOOL_CALLS = 2;

// ---------------------------------------------------------------- inputs (what the server loads)

type Published = { publication: { state: string } };
export type ToolHospital = Published & {
  _id: string;
  name: string;
  city: string;
  specialtyCodes: string[];
  accreditations: (string | { body: string; name?: string | null })[];
};
export type ToolDoctor = Published & {
  _id: string;
  name: string;
  consentToList: boolean;
  specialtyCode: string | null;
  specialties?: { code: string }[];
  languages?: string[];
};
export type ToolLink = { hospitalId: string; doctorId: string; current?: boolean };
export type ToolSchedule = { hospitalId: string; doctorId: string; day: string | null };
export type ToolSpecialty = { _id: string; name: { en?: string } | null };

const isPublished = (item: Published) => item.publication?.state === "published";

// ---------------------------------------------------------------- matching what the AI passed

const words = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

/** "cardiologist" → cardiology: a shared stem of six letters or the code itself. */
export function matchSpecialty(text: string, specialties: ToolSpecialty[]): string[] {
  const asked = words(text);
  if (asked.length === 0) return [];
  return specialties
    .filter((item) => {
      const names = [item._id.replace(/-/g, " "), item.name?.en ?? ""].flatMap(words).filter((word) => word.length >= 5);
      return names.some((name) => asked.some((word) => word.length >= 5 && name.slice(0, 6) === word.slice(0, 6)));
    })
    .map((item) => item._id);
}

const LANGUAGE_CODES: Record<string, string> = {
  english: "en", russian: "ru", uzbek: "uz", hindi: "hi", tajik: "tg", kazakh: "kk", kyrgyz: "ky", turkmen: "tk",
  azerbaijani: "az", turkish: "tr", persian: "fa", farsi: "fa", arabic: "ar", bengali: "bn", french: "fr",
  русский: "ru", английский: "en", узбекский: "uz", "o'zbek": "uz", ozbek: "uz", rus: "ru",
};
const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  ["en:English", "ru:Russian", "uz:Uzbek", "hi:Hindi", "tg:Tajik", "kk:Kazakh", "ky:Kyrgyz", "tk:Turkmen", "az:Azerbaijani", "tr:Turkish", "fa:Persian", "ar:Arabic", "bn:Bengali", "fr:French"].map((pair) => pair.split(":")),
);
export function languageCode(text: string): string | null {
  const value = text.trim().toLowerCase();
  if (!value) return null;
  if (/^[a-z]{2}$/.test(value)) return value;
  return LANGUAGE_CODES[value] ?? Object.entries(LANGUAGE_CODES).find(([name]) => value.startsWith(name.slice(0, 4)))?.[1] ?? null;
}

const GENERIC = new Set(["hospital", "hospitals", "super", "speciality", "specialty", "institute", "medical", "the", "centre", "center", "research", "heart", "care", "health", "clinic", "multi", "and", "sciences", "city"]);

/**
 * The published hospital the patient names in a message ("what about
 * Medanta?"), or null. The server keeps it as the conversation's hospital, so
 * list_doctors follows the patient, not the AI.
 */
export function hospitalNamed(text: string, hospitals: ToolHospital[]): ToolHospital | null {
  const said = new Set(words(text));
  let best: { hospital: ToolHospital; score: number } | null = null;
  for (const hospital of hospitals.filter(isPublished)) {
    const distinctive = words(hospital.name).filter((word) => word.length >= 4 && !GENERIC.has(word));
    const score = distinctive.filter((word) => said.has(word)).length;
    if (score > 0 && (!best || score > best.score)) best = { hospital, score };
  }
  return best?.hospital ?? null;
}

// ---------------------------------------------------------------- outputs (only these fields)

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export type DoctorRow = { name: string; specialty: string; languages: string[]; days: string[] };

/** Doctors at this hospital — only if the hospital and the doctor are published and the doctor consented. */
export function doctorsAt(input: {
  hospital: ToolHospital | null;
  doctors: ToolDoctor[];
  links: ToolLink[];
  schedules: ToolSchedule[];
  specialties: ToolSpecialty[];
  specialty?: string;
  language?: string;
}): DoctorRow[] {
  const hospital = input.hospital;
  if (!hospital || !isPublished(hospital)) return [];
  const atHospital = new Set([
    ...input.links.filter((link) => link.hospitalId === hospital._id && link.current !== false).map((link) => link.doctorId),
    ...input.schedules.filter((row) => row.hospitalId === hospital._id).map((row) => row.doctorId),
  ]);
  const wanted = input.specialty?.trim() ? matchSpecialty(input.specialty, input.specialties) : null;
  const language = input.language ? languageCode(input.language) : null;
  const nameOf = (code: string | null) => input.specialties.find((item) => item._id === code)?.name?.en ?? code ?? "";
  return input.doctors
    .filter((doctor) => atHospital.has(doctor._id) && doctor.consentToList && isPublished(doctor))
    .filter((doctor) => {
      if (!wanted) return true;
      const codes = [doctor.specialtyCode, ...(doctor.specialties ?? []).map((item) => item.code)].filter(Boolean) as string[];
      return codes.some((code) => wanted.includes(code));
    })
    .filter((doctor) => !language || (doctor.languages ?? []).includes(language))
    .slice(0, 10)
    .map((doctor) => ({
      name: doctor.name,
      specialty: nameOf(doctor.specialtyCode ?? doctor.specialties?.[0]?.code ?? null),
      languages: (doctor.languages ?? []).map((code) => LANGUAGE_NAMES[code] ?? code),
      days: [
        ...new Set(
          input.schedules.filter((row) => row.hospitalId === hospital._id && row.doctorId === doctor._id && row.day).map((row) => row.day!),
        ),
      ].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)),
    }));
}

export type HospitalRow = { name: string; city: string; accreditation: string[] };

/** Published hospitals, by city and specialty. A research-stage hospital is never returned. */
export function hospitalsFor(input: { hospitals: ToolHospital[]; city?: string; specialtyCodes?: string[] }): HospitalRow[] {
  const city = input.city?.trim().toLowerCase() ?? "";
  return input.hospitals
    .filter(isPublished)
    .filter((hospital) => !city || hospital.city.toLowerCase().includes(city) || city.includes(hospital.city.toLowerCase()))
    .filter((hospital) => !input.specialtyCodes?.length || hospital.specialtyCodes.some((code) => input.specialtyCodes!.includes(code)))
    .slice(0, 8)
    .map((hospital) => ({
      name: hospital.name,
      city: hospital.city,
      accreditation: (hospital.accreditations ?? []).map((item) => (typeof item === "string" ? item : item.name || item.body)),
    }));
}

export type BandRow = { treatment: string; from: number; to: number; currency: string; note: "indicative starting range; the free plan gives the itemised estimate the hospital confirms" };

export function bandRow(treatment: string, band: { min: number; max: number; currency: string } | null): BandRow | null {
  return band
    ? { treatment, from: band.min, to: band.max, currency: band.currency, note: "indicative starting range; the free plan gives the itemised estimate the hospital confirms" }
    : null;
}

export type StatusRow = { stage: string; nextStep: string; reference: string };

/** "…X3I": a case number is never handed to the AI whole. */
export const maskReference = (reference: string) => `…${reference.slice(-3)}`;
