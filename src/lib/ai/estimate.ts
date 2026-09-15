import type { PriceBand } from "../catalogue";

/**
 * The estimate. Deliberately not the model's job: a number a patient plans
 * around comes from the catalogue, and is labelled by where it came from.
 */
export type Estimate =
  | { kind: "none" }
  | {
      kind: "indicative" | "quoted";
      currency: string;
      min: number;
      max: number;
      inclusions: string[];
      exclusions: string[];
    };

export function estimateFor(treatmentCode: string | null, bands: PriceBand[]): Estimate {
  if (!treatmentCode) return { kind: "none" };
  const band = bands.find((b) => b.treatmentCode === treatmentCode);
  if (!band) return { kind: "none" };
  return {
    kind: band.basis === "negotiated-average" ? "quoted" : "indicative",
    currency: band.currency,
    min: band.min,
    max: band.max,
    inclusions: band.inclusions ?? [],
    exclusions: band.exclusions ?? [],
  };
}
