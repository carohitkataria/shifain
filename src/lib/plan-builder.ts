/**
 * Rules-based plan generator that filters seed data.
 * Same input/output shape as the future AI call so the UI never changes.
 */

import {
  PACKAGES, HOSPITALS, DOCTORS,
  type SeedPackage, type SeedHospital, type SeedDoctor,
} from "./seed-data";

export type PlanInput = {
  specialty: string;
  procedure: string | null;
  ageBand: string;
  gender: string;
  residence: string;
  destination: string;
  priority: "cost" | "value" | "rating";
  cities: string[];
  urgency: string;
  contact: { phone: string; email: string };
};

export type EstimateBreakdown = {
  label: string;
  range: string;
  free?: boolean;
};

export type PlanResult = {
  estimateMin: number;
  estimateMax: number;
  breakdown: EstimateBreakdown[];
  packages: SeedPackage[];
  hospitals: SeedHospital[];
  doctors: SeedDoctor[];
};

function matchesFilter(item: { specialty: string; city?: string }, input: PlanInput): boolean {
  if (item.specialty !== input.specialty) return false;
  if (input.cities.length > 0 && item.city && !input.cities.includes(item.city)) return false;
  return true;
}

function sortByPriority<T extends { rating: number }>(
  items: T[],
  priority: PlanInput["priority"],
  priceKey: keyof T,
): T[] {
  const sorted = [...items];
  switch (priority) {
    case "cost":
      sorted.sort((a, b) => (a[priceKey] as number) - (b[priceKey] as number));
      break;
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "value":
    default:
      sorted.sort((a, b) => {
        const scoreA = a.rating * 20 - (a[priceKey] as number) / 1000;
        const scoreB = b.rating * 20 - (b[priceKey] as number) / 1000;
        return scoreB - scoreA;
      });
  }
  return sorted;
}

export function buildPlanFromSeed(input: PlanInput): PlanResult {
  let packages = PACKAGES.filter((p) => matchesFilter(p, input));
  if (input.procedure) {
    const procedureMatch = packages.filter((p) => p.procedure === input.procedure);
    if (procedureMatch.length > 0) packages = procedureMatch;
  }
  if (packages.length === 0) packages = PACKAGES.filter((p) => p.specialty === input.specialty);

  let hospitals = HOSPITALS.filter((h) => matchesFilter(h, input));
  if (hospitals.length === 0) hospitals = HOSPITALS.filter((h) => h.specialty === input.specialty);

  let doctors = DOCTORS.filter((d) => matchesFilter(d, input));
  if (doctors.length === 0) doctors = DOCTORS.filter((d) => d.specialty === input.specialty);

  packages = sortByPriority(packages, input.priority, "priceMin");
  hospitals = sortByPriority(hospitals, input.priority, "priceFrom");
  doctors = sortByPriority(doctors, input.priority, "rating");

  const procedureMin = packages.length > 0 ? Math.min(...packages.map((p) => p.priceMin)) : 4000;
  const procedureMax = packages.length > 0 ? Math.max(...packages.map((p) => p.priceMax)) : 8000;
  const testsMin = Math.round(procedureMin * 0.06);
  const testsMax = Math.round(procedureMax * 0.08);
  const travelMin = 500;
  const travelMax = 800;

  const estimateMin = procedureMin + testsMin + travelMin;
  const estimateMax = procedureMax + testsMax + travelMax;

  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

  const breakdown: EstimateBreakdown[] = [
    { label: "Procedure & hospital stay", range: `${fmt(procedureMin)}–${fmt(procedureMax)}` },
    { label: "Pre-op tests & consultation", range: `${fmt(testsMin)}–${fmt(testsMax)}` },
    { label: "Estimated travel & stay (14 days)", range: `${fmt(travelMin)}–${fmt(travelMax)}` },
    { label: "Shifain coordination, visa letter, interpreter", range: "Free", free: true },
  ];

  return { estimateMin, estimateMax, breakdown, packages, hospitals, doctors };
}

const AI_ENABLED = false;

export async function generatePlanEstimate(input: PlanInput): Promise<PlanResult> {
  if (AI_ENABLED) {
    // Future: return callAiPlan(input);
  }
  return buildPlanFromSeed(input);
}
