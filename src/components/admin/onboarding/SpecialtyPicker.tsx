"use client";

import { useMemo, useState } from "react";
import { adminField, adminLabel } from "../Panel";

type Option = { code: string; name: string; group: string };

/**
 * Category → doctor, both ways a patient searches: the specialties a doctor
 * practises (the first is primary, each with an optional sub-specialty) and
 * the procedures they perform. Only procedures within the chosen specialties
 * are offered, which is the rule the server enforces as well.
 */
export function SpecialtyPicker({
  specialties,
  subSpecialties,
  procedures,
  initialSpecialties,
  initialProcedures,
}: {
  specialties: Option[];
  subSpecialties: { id: string; specialtyCode: string; name: string }[];
  /** `group` here is unused; `specialties` lists every specialty the procedure belongs to. */
  procedures: { code: string; name: string; specialties: string[] }[];
  initialSpecialties: { code: string; subSpecialty: string | null }[];
  initialProcedures: string[];
}) {
  const [chosen, setChosen] = useState(initialSpecialties);
  const [primary, setPrimary] = useState(initialSpecialties[0]?.code ?? "");
  const [picked, setPicked] = useState(() => new Set(initialProcedures));
  const [filter, setFilter] = useState("");

  const nameOf = (code: string) => specialties.find((item) => item.code === code)?.name ?? code;
  const chosenCodes = chosen.map((item) => item.code);

  const toggleSpecialty = (code: string) => {
    setChosen((current) => {
      const next = current.some((item) => item.code === code) ? current.filter((item) => item.code !== code) : [...current, { code, subSpecialty: null }];
      if (!next.some((item) => item.code === primary)) setPrimary(next[0]?.code ?? "");
      return next;
    });
  };

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const map = new Map<string, Option[]>();
    for (const item of specialties) {
      if (needle && !item.name.toLowerCase().includes(needle)) continue;
      map.set(item.group, [...(map.get(item.group) ?? []), item]);
    }
    return [...map.entries()];
  }, [specialties, filter]);

  // Each procedure once, under the first chosen specialty it belongs to.
  const offered = chosenCodes.map((code) => ({
    code,
    items: procedures.filter((item) => item.specialties.includes(code) && chosenCodes.find((c) => item.specialties.includes(c)) === code),
  }));
  const inScope = new Set(offered.flatMap((group) => group.items.map((item) => item.code)));
  const pickedInScope = [...picked].filter((code) => inScope.has(code));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <label htmlFor="specialty-filter" className={adminLabel}>
          Specialties
        </label>
        <input
          id="specialty-filter"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter specialties"
          className={adminField}
        />
        <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-line p-2">
          {groups.map(([group, items]) => (
            <fieldset key={group} className="mb-2">
              <legend className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{group}</legend>
              {items.map((item) => (
                <label key={item.code} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-ink hover:bg-surface-muted">
                  <input type="checkbox" checked={chosenCodes.includes(item.code)} onChange={() => toggleSpecialty(item.code)} className="h-4 w-4 accent-brand" />
                  {item.name}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className={adminLabel}>Chosen ({chosen.length})</p>
          {chosen.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-ink-soft">Tick at least one specialty. The primary one leads the doctor&rsquo;s profile.</p>
          ) : (
            <ul className="space-y-2">
              {chosen.map((item) => {
                const subs = subSpecialties.filter((sub) => sub.specialtyCode === item.code);
                const known = item.subSpecialty === null || subs.some((sub) => sub.name === item.subSpecialty);
                return (
                  <li key={item.code} className="rounded-xl border border-line bg-white p-3">
                    <input type="hidden" name="specialties" value={item.code} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{nameOf(item.code)}</span>
                      <label className="flex min-h-9 items-center gap-2 text-sm text-ink-soft">
                        <input type="radio" name="primarySpecialty" value={item.code} checked={primary === item.code} onChange={() => setPrimary(item.code)} className="h-4 w-4 accent-brand" />
                        Primary
                      </label>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <select
                        name={`sub.${item.code}`}
                        defaultValue={known ? (item.subSpecialty ?? "") : "__new"}
                        aria-label={`Sub-specialty in ${nameOf(item.code)}`}
                        className={adminField}
                        onChange={(event) =>
                          setChosen((current) =>
                            current.map((row) => (row.code === item.code ? { ...row, subSpecialty: event.target.value === "__new" ? "" : event.target.value || null } : row)),
                          )
                        }
                      >
                        <option value="">No sub-specialty</option>
                        {subs.map((sub) => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                        <option value="__new">Add a new sub-specialty…</option>
                      </select>
                      {!known || item.subSpecialty === "" ? (
                        <input
                          name={`subNew.${item.code}`}
                          defaultValue={known ? "" : (item.subSpecialty ?? "")}
                          placeholder="e.g. Interventional cardiology"
                          aria-label={`New sub-specialty in ${nameOf(item.code)}`}
                          className={adminField}
                        />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <p className={adminLabel}>
            Procedures performed ({pickedInScope.length})
          </p>
          {offered.length === 0 ? (
            <p className="text-sm text-ink-soft">Procedures appear once a specialty is chosen.</p>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-line p-3">
              {offered.map((group) =>
                group.items.length ? (
                  <fieldset key={group.code}>
                    <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{nameOf(group.code)}</legend>
                    <div className="grid gap-x-3 sm:grid-cols-2">
                      {group.items.map((item) => (
                        <label key={item.code} className="flex min-h-10 cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface-muted">
                          <input
                            type="checkbox"
                            name="procedures"
                            value={item.code}
                            checked={picked.has(item.code)}
                            onChange={(event) =>
                              setPicked((current) => {
                                const next = new Set(current);
                                if (event.target.checked) next.add(item.code);
                                else next.delete(item.code);
                                return next;
                              })
                            }
                            className="mt-0.5 h-4 w-4 flex-none accent-brand"
                          />
                          {item.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null,
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
