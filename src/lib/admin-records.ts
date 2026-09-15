import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import type { Doctor, Hospital } from "./catalogue";

/** "Apollo Hospital" + "Delhi" -> "h-apollo-hospital-delhi" */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const list = (value: FormDataEntryValue | string | null | undefined): string[] =>
  String(value ?? "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const numberOrNull = (value: FormDataEntryValue | string | null | undefined): number | null => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

export const text = (value: FormDataEntryValue | string | null | undefined): string | null =>
  String(value ?? "").trim() || null;

/**
 * Provenance for anything a person typed into the panel. Distinguishing this
 * from researched rows is what lets the team see, later, which records they
 * actually stand behind.
 */
export function authoredProvenance(source = "ShifaIn admin panel") {
  return {
    source,
    sourceUrl: null,
    method: "authored" as const,
    collectedAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
  };
}

/** A hospital id that stays unique when a chain runs the same name twice. */
export async function uniqueHospitalId(name: string, city: string): Promise<string> {
  const base = `h-${slug(name)}-${slug(city)}`;
  const db = await getDb();
  const hospitals = db.collection<Hospital>("hospitals");
  if (!(await hospitals.findOne({ _id: base }))) return base;
  for (let n = 2; n < 50; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await hospitals.findOne({ _id: candidate }))) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

export async function uniqueDoctorId(name: string): Promise<string> {
  const base = `d-${slug(name)}`;
  const db = await getDb();
  const doctors = db.collection<Doctor>("doctors");
  if (!(await doctors.findOne({ _id: base }))) return base;
  for (let n = 2; n < 50; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await doctors.findOne({ _id: candidate }))) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Everything a new hospital needs to satisfy the schema and the gate. */
export function blankHospital(id: string, name: string, city: string): Hospital {
  return {
    _id: id,
    name,
    legalName: null,
    city,
    state: null,
    country: "India",
    nearestAirportIata: null,
    hospitalType: null,
    beds: null,
    icuBeds: null,
    accreditations: [],
    specialtyCodes: [],
    capabilities: [],
    internationalDesk: { exists: null, contactName: null, email: null, phone: null, languages: [] },
    officialWebsite: null,
    about: null,
    // A new record starts where every record starts: not publishable.
    partnerStatus: "prospect",
    publication: { state: "research", publishedAt: null, tieupId: null },
  };
}

export function blankDoctor(id: string, name: string): Doctor {
  return {
    _id: id,
    name,
    specialtyCode: null,
    specialtyLabelRaw: null,
    qualifications: null,
    registrationNumber: null,
    experienceYears: null,
    officialProfileUrl: null,
    about: null,
    consentToList: false,
    partnerStatus: "prospect",
    publication: { state: "research", publishedAt: null, tieupId: null },
  };
}

// -------------------------------------------------------------- bulk import

export type ImportRow = Record<string, string>;

/**
 * A small CSV reader: quoted fields, doubled quotes, CRLF. Enough for a sheet
 * exported from Excel or Google Sheets, which is what people actually paste.
 */
export function parseCsv(input: string): ImportRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "," || char === "\t") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((line) => line.some((value) => value.trim()));
  if (!header) return [];

  const keys = header.map((key) => key.trim().toLowerCase().replace(/\s+/g, ""));
  return body.map((line) =>
    Object.fromEntries(keys.map((key, index) => [key, (line[index] ?? "").trim()])),
  );
}

/** Reads a column under any of several spellings people actually use. */
export function pick(row: ImportRow, ...names: string[]): string {
  for (const name of names) {
    const value = row[name.toLowerCase().replace(/\s+/g, "")];
    if (value) return value;
  }
  return "";
}
