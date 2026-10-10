"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FieldLabel } from "./FieldLabel";
import { SPECIALTIES, CITIES } from "@/lib/seed-data";
import type { PlanInput } from "@/lib/plan-builder";

const AGES = ["Under 18", "18–40", "41–60", "60+"];
const GENDERS = ["Male", "Female", "Prefer not to say"];
const COUNTRIES_LIST = ["Nigeria", "Kenya", "Bangladesh", "Iraq", "UAE", "Uzbekistan", "Russia", "Other"];
const URGENCIES = ["As soon as possible", "Within 1–3 months", "Just exploring"];
const PRIORITIES: { key: PlanInput["priority"]; icon: string; label: string }[] = [
  { key: "cost", icon: "💰", label: "Lowest cost" },
  { key: "value", icon: "⚖️", label: "Best value" },
  { key: "rating", icon: "⭐", label: "Top rated" },
];

export function PlanWizard({
  locale,
  initialSpecialty,
}: {
  locale: string;
  initialSpecialty?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [specialty, setSpecialty] = useState(initialSpecialty || "cardiac");
  const [procedure, setProcedure] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState("41–60");
  const [gender, setGender] = useState("Male");
  const [residence, setResidence] = useState("Nigeria");
  const [urgency, setUrgency] = useState("Within 1–3 months");
  const [priority, setPriority] = useState<PlanInput["priority"]>("value");
  const [cities, setCities] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const specObj = SPECIALTIES.find((s) => s.slug === specialty);
  const procedures = specObj?.procedures ?? [];

  const toggleCity = useCallback((c: string) => {
    setCities((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }, []);

  const goTo = useCallback(
    (n: number) => {
      setStep(n);
      window.scrollTo(0, 0);
    },
    [],
  );

  const submit = useCallback(() => {
    const input: PlanInput = {
      specialty,
      procedure,
      ageBand,
      gender,
      residence,
      destination: "IN",
      priority,
      cities,
      urgency,
      contact: { phone, email },
    };
    try { sessionStorage.setItem("shifain_plan_input", JSON.stringify(input)); } catch {}
    router.push(`/${locale}/plan/results`);
  }, [specialty, procedure, ageBand, gender, residence, priority, cities, urgency, phone, email, locale, router]);

  const progressBar = (
    <div className="mb-6 flex gap-2">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            n < step ? "bg-brand" : n === step ? "bg-saffron" : "bg-line"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      {progressBar}

      {/* Step 1: Treatment */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            What do you need treatment for?
          </h2>
          <p className="mt-1 text-ink-soft">This is all we need to start building your estimate.</p>
          <div className="card mt-6 p-6">
            <FieldLabel text="Treatment area" />
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  className={`rounded-xl2 border-[1.5px] p-4 text-center transition ${
                    specialty === s.slug
                      ? "border-brand bg-brand-tint"
                      : "border-line bg-surface hover:border-brand"
                  }`}
                  onClick={() => { setSpecialty(s.slug); setProcedure(null); }}
                >
                  <span className="block text-2xl">{s.icon}</span>
                  <span className="mt-1 block text-sm font-bold">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <FieldLabel
                text="Specific procedure (optional)"
                hint="If you already know the procedure your doctor recommended, pick it for a tighter estimate. Otherwise skip — we'll show the common options."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {procedures.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                      procedure === p
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-surface hover:border-brand"
                    }`}
                    onClick={() => setProcedure(procedure === p ? null : p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                    procedure === null
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-surface hover:border-brand"
                  }`}
                  onClick={() => setProcedure(null)}
                >
                  I&apos;m not sure yet
                </button>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" className="btn btn-accent" onClick={() => goTo(2)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Who */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            Who is the treatment for?
          </h2>
          <p className="mt-1 text-ink-soft">
            Basic details help us match the right packages. No medical history needed yet.
          </p>
          <div className="card mt-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel
                  text="Patient age"
                  hint="An age band is enough — it affects which packages and doctors are relevant."
                  htmlFor="wiz-age"
                />
                <select
                  id="wiz-age"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                >
                  {AGES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel text="Gender" htmlFor="wiz-gender" />
                <select
                  id="wiz-gender"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel
                  text="Country of residence"
                  hint="Used to show costs in your currency and to prepare visa guidance later."
                  htmlFor="wiz-country"
                />
                <select
                  id="wiz-country"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                >
                  {COUNTRIES_LIST.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel
                  text="How soon?"
                  hint="Just an indication — it helps us prioritise hospitals with earlier availability."
                  htmlFor="wiz-urgency"
                />
                <select
                  id="wiz-urgency"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                >
                  {URGENCIES.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(1)}>
              ← Back
            </button>
            <button type="button" className="btn btn-accent" onClick={() => goTo(3)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Priority */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            What matters most to you?
          </h2>
          <p className="mt-1 text-ink-soft">
            We&apos;ll sort your matches around this. You can change it anytime.
          </p>
          <div className="card mt-6 p-6">
            <FieldLabel text="Priority" />
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`rounded-xl2 border-[1.5px] p-4 text-center transition ${
                    priority === p.key
                      ? "border-brand bg-brand-tint"
                      : "border-line bg-surface hover:border-brand"
                  }`}
                  onClick={() => setPriority(p.key)}
                >
                  <span className="block text-2xl">{p.icon}</span>
                  <span className="mt-1 block text-sm font-bold">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <FieldLabel
                text="Preferred cities (optional)"
                hint="Leave empty to see all cities. Choosing cities narrows hospitals and can affect travel cost."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`rounded-full border-[1.5px] px-4 py-2 text-sm font-semibold transition ${
                      cities.includes(c)
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-surface hover:border-brand"
                    }`}
                    onClick={() => toggleCity(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(2)}>
              ← Back
            </button>
            <button type="button" className="btn btn-accent" onClick={() => goTo(4)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Contact */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            Where should we send your plan?
          </h2>
          <p className="mt-1 text-ink-soft">
            We&apos;ll save your estimate to your account and share a copy.
          </p>
          <div className="card mt-6 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel
                  text="Mobile number"
                  hint="We'll send a one-time code to verify it's you and to save your plan. No spam."
                  htmlFor="wiz-phone"
                />
                <input
                  id="wiz-phone"
                  type="tel"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel text="Email (optional)" htmlFor="wiz-email" />
                <input
                  id="wiz-email"
                  type="email"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl2 bg-surface-muted p-4 text-sm text-ink-soft">
              <span className="text-lg">🔒</span>
              <div>
                <span className="font-bold text-ink">You can add these later, inside your account:</span>{" "}
                medical reports & scans, passport & visa documents, exact travel dates, number of
                attendants, insurance details, and appointment scheduling.
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(3)}>
              ← Back
            </button>
            <button type="button" className="btn btn-accent" onClick={submit}>
              Generate my plan & estimate →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
