"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildPlanFromSeed } from "@/lib/plan-builder";
import type { PlanInput, PlanResult, EstimateBreakdown } from "@/lib/plan-builder";
import type { SeedPackage, SeedHospital, SeedDoctor } from "@/lib/seed-data";
import { SPECIALTIES } from "@/lib/seed-data";

type Tab = "packages" | "hospitals" | "doctors";
type SortKey = "relevance" | "priceAsc" | "priceDesc" | "rating" | "experience";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "priceAsc", label: "Price: low → high" },
  { value: "priceDesc", label: "Price: high → low" },
  { value: "rating", label: "Rating" },
  { value: "experience", label: "Experience / success rate" },
];

function stars(r: number) {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((w) => !/^(Dr\.|Institute|of|and|&)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

function PackageCard({ pkg }: { pkg: SeedPackage }) {
  return (
    <div className="card mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-4 p-[18px] max-sm:grid-cols-1">
      <div className="grid h-14 w-14 flex-none place-items-center rounded-xl2 bg-brand-tint font-bold text-brand-deep max-sm:hidden">
        {initials(pkg.name)}
      </div>
      <div>
        <h4 className="text-[17px] font-bold">{pkg.name}</h4>
        <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-ink-soft">
          <span className="text-saffron">{stars(pkg.rating)} {pkg.rating}</span>
          <span>📍 {pkg.city}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-saffron">
            {pkg.accreditation}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            🗣️ {pkg.languages.join(", ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            {pkg.successRate}% success
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-ink-soft">{pkg.sub}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary text-sm">＋ Shortlist</button>
          <button type="button" className="btn btn-secondary text-sm">Ask a question</button>
          <button type="button" className="btn btn-accent text-sm">Get exact quote</button>
        </div>
      </div>
      <div className="text-right max-sm:text-left">
        <div className="text-xs text-ink-soft">from</div>
        <div className="text-xl font-bold">{fmt(pkg.priceMin)}</div>
      </div>
    </div>
  );
}

function HospitalCard({ hosp }: { hosp: SeedHospital }) {
  return (
    <div className="card mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-4 p-[18px] max-sm:grid-cols-1">
      <div className="grid h-14 w-14 flex-none place-items-center rounded-xl2 bg-brand-tint font-bold text-brand-deep max-sm:hidden">
        {initials(hosp.name)}
      </div>
      <div>
        <h4 className="text-[17px] font-bold">{hosp.name}</h4>
        <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-ink-soft">
          <span className="text-saffron">{stars(hosp.rating)} {hosp.rating}</span>
          <span>📍 {hosp.city}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-saffron-tint px-2 py-0.5 text-xs font-semibold text-saffron">
            {hosp.accreditation}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            🗣️ {hosp.languages.join(", ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            {hosp.successRate}% success
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-ink-soft">{hosp.sub}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary text-sm">＋ Shortlist</button>
          <button type="button" className="btn btn-secondary text-sm">Ask a question</button>
          <button type="button" className="btn btn-accent text-sm">Get exact quote</button>
        </div>
      </div>
      <div className="text-right max-sm:text-left">
        <div className="text-xs text-ink-soft">from</div>
        <div className="text-xl font-bold">{fmt(hosp.priceFrom)}</div>
      </div>
    </div>
  );
}

function DoctorCard({ doc }: { doc: SeedDoctor }) {
  return (
    <div className="card mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-4 p-[18px] max-sm:grid-cols-1">
      <div className="grid h-14 w-14 flex-none place-items-center rounded-xl2 bg-brand-tint font-bold text-brand-deep max-sm:hidden">
        {initials(doc.name)}
      </div>
      <div>
        <h4 className="text-[17px] font-bold">{doc.name}</h4>
        <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13.5px] text-ink-soft">
          <span className="text-saffron">{stars(doc.rating)} {doc.rating}</span>
          <span>📍 {doc.city}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            🗣️ {doc.languages.join(", ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold text-brand-deep">
            {doc.experienceYrs} yrs · {doc.proceduresDone.toLocaleString()} procedures
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-ink-soft">{doc.title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary text-sm">＋ Shortlist</button>
          <button type="button" className="btn btn-secondary text-sm">Ask a question</button>
          <button type="button" className="btn btn-accent text-sm">Get exact quote</button>
        </div>
      </div>
      <div className="text-right max-sm:text-left">
        <div className="text-xl font-bold">{doc.experienceYrs} yrs</div>
        <div className="text-xs text-ink-soft">{doc.rating}★ rating</div>
      </div>
    </div>
  );
}

export function PlanResults({ locale }: { locale: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [input, setInput] = useState<PlanInput | null>(null);
  const [tab, setTab] = useState<Tab>("packages");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [filters, setFilters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("shifain_plan_input");
      if (!raw) {
        router.replace(`/${locale}/plan/wizard`);
        return;
      }
      const parsed: PlanInput = JSON.parse(raw);
      setInput(parsed);
      setPlan(buildPlanFromSeed(parsed));
    } catch {
      router.replace(`/${locale}/plan/wizard`);
    }
  }, [locale, router]);

  const specLabel = useMemo(() => {
    if (!input) return "";
    const spec = SPECIALTIES.find((s) => s.slug === input.specialty);
    return spec?.label ?? input.specialty;
  }, [input]);

  const priorityLabel = useMemo(() => {
    if (!input) return "";
    const map: Record<string, string> = { cost: "Lowest cost", value: "Best value", rating: "Top rated" };
    return map[input.priority] ?? input.priority;
  }, [input]);

  const toggleFilter = useCallback((key: string) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const availableFilters = useMemo(() => {
    if (!plan) return [];
    const allCities = new Set<string>();
    const allLangs = new Set<string>();
    plan.packages.forEach((p) => { allCities.add(p.city); p.languages.forEach((l) => allLangs.add(l)); });
    plan.hospitals.forEach((h) => { allCities.add(h.city); h.languages.forEach((l) => allLangs.add(l)); });
    plan.doctors.forEach((d) => { allCities.add(d.city); d.languages.forEach((l) => allLangs.add(l)); });
    const chips: { key: string; label: string }[] = [
      { key: "accredited", label: "NABH / JCI only" },
    ];
    [...allCities].sort().forEach((c) => chips.push({ key: `city:${c}`, label: c }));
    [...allLangs].filter((l) => l !== "English").sort().forEach((l) => chips.push({ key: `lang:${l}`, label: `Speaks ${l}` }));
    return chips;
  }, [plan]);

  const sortedFiltered = useMemo(() => {
    if (!plan) return { packages: [] as SeedPackage[], hospitals: [] as SeedHospital[], doctors: [] as SeedDoctor[] };

    const activeFilters = Object.entries(filters).filter(([, v]) => v).map(([k]) => k);
    const cityFilters = activeFilters.filter((f) => f.startsWith("city:")).map((f) => f.slice(5));
    const langFilters = activeFilters.filter((f) => f.startsWith("lang:")).map((f) => f.slice(5));
    const accFilter = activeFilters.includes("accredited");

    function applyFilters<T extends { city: string; languages: string[] }>(
      items: (T & { accreditation?: string })[],
    ): T[] {
      return items.filter((item) => {
        if (cityFilters.length > 0 && !cityFilters.includes(item.city)) return false;
        if (langFilters.length > 0 && !langFilters.some((l) => item.languages.includes(l))) return false;
        if (accFilter && item.accreditation && !["NABH", "JCI"].includes(item.accreditation)) return false;
        return true;
      });
    }

    let packages = applyFilters(plan.packages as (SeedPackage & { accreditation?: string })[]) as SeedPackage[];
    let hospitals = applyFilters(plan.hospitals as (SeedHospital & { accreditation?: string })[]) as SeedHospital[];
    let doctors = applyFilters(plan.doctors as unknown as (SeedDoctor & { accreditation?: string; city: string; languages: string[] })[]) as SeedDoctor[];

    switch (sort) {
      case "priceAsc":
        packages = [...packages].sort((a, b) => a.priceMin - b.priceMin);
        hospitals = [...hospitals].sort((a, b) => a.priceFrom - b.priceFrom);
        break;
      case "priceDesc":
        packages = [...packages].sort((a, b) => b.priceMax - a.priceMax);
        hospitals = [...hospitals].sort((a, b) => b.priceFrom - a.priceFrom);
        break;
      case "rating":
        packages = [...packages].sort((a, b) => b.rating - a.rating);
        hospitals = [...hospitals].sort((a, b) => b.rating - a.rating);
        doctors = [...doctors].sort((a, b) => b.rating - a.rating);
        break;
      case "experience":
        packages = [...packages].sort((a, b) => b.successRate - a.successRate);
        hospitals = [...hospitals].sort((a, b) => b.successRate - a.successRate);
        doctors = [...doctors].sort((a, b) => b.experienceYrs - a.experienceYrs);
        break;
    }

    return { packages, hospitals, doctors };
  }, [plan, sort, filters]);

  if (!plan || !input) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center text-ink-soft">
        Loading your estimate...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">
            Your plan · {specLabel}
            {input.procedure ? ` → ${input.procedure}` : ""} · {priorityLabel}
          </div>
          <h2 className="section-title mt-1 text-[30px]">
            Here&apos;s your estimate and matches
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => router.push(`/${locale}/portal/patient/login`)}
        >
          💾 Save this plan
        </button>
      </div>

      {/* Estimate card */}
      <div className="estimate-card mb-6 grid gap-6 rounded-2xl p-6 text-white md:grid-cols-[1.1fr_1fr]">
        <div>
          <h3 className="text-lg font-bold text-white">Estimated total cost</h3>
          <div className="mt-1.5 text-[40px] font-bold leading-tight">
            {fmt(plan.estimateMin)} – {fmt(plan.estimateMax)}
          </div>
          <p className="mt-1 text-sm opacity-80">
            All-in range for {input.procedure ?? specLabel} in India, incl. hospital stay &amp; standard tests. Final quote after report review.
          </p>
          <button
            type="button"
            className="btn btn-accent mt-4 text-sm"
            onClick={() => router.push(`/${locale}/portal/patient/login`)}
          >
            Get an exact quote →
          </button>
        </div>
        <div className="rounded-xl2 bg-white/[.08] p-4">
          {plan.breakdown.map((row: EstimateBreakdown) => (
            <div
              key={row.label}
              className={`flex justify-between py-1.5 text-sm ${
                row.free ? "text-saffron-tint font-bold" : "text-white/85"
              }`}
            >
              <span>{row.label}</span>
              <b>{row.range}</b>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto border-b border-line">
        {(["packages", "hospitals", "doctors"] as Tab[]).map((t) => {
          const count =
            t === "packages"
              ? sortedFiltered.packages.length
              : t === "hospitals"
                ? sortedFiltered.hospitals.length
                : sortedFiltered.doctors.length;
          const labels: Record<Tab, string> = {
            packages: "Packages",
            hospitals: "Hospitals",
            doctors: "Doctors",
          };
          return (
            <button
              key={t}
              type="button"
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-[15px] font-semibold transition ${
                tab === t
                  ? "border-saffron text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
              onClick={() => setTab(t)}
            >
              {labels[t]} ({count})
            </button>
          );
        })}
      </div>

      {/* Toolbar: sort + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          Sort by
          <select
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                filters[f.key]
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface hover:border-brand"
              }`}
              onClick={() => toggleFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result list */}
      <div>
        {tab === "packages" &&
          (sortedFiltered.packages.length > 0 ? (
            sortedFiltered.packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
          ) : (
            <p className="py-8 text-center text-ink-soft">No packages match your filters.</p>
          ))}
        {tab === "hospitals" &&
          (sortedFiltered.hospitals.length > 0 ? (
            sortedFiltered.hospitals.map((h) => <HospitalCard key={h.id} hosp={h} />)
          ) : (
            <p className="py-8 text-center text-ink-soft">No hospitals match your filters.</p>
          ))}
        {tab === "doctors" &&
          (sortedFiltered.doctors.length > 0 ? (
            sortedFiltered.doctors.map((d) => <DoctorCard key={d.id} doc={d} />)
          ) : (
            <p className="py-8 text-center text-ink-soft">No doctors match your filters.</p>
          ))}
      </div>
    </div>
  );
}
