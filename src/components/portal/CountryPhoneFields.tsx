"use client";

import { useState } from "react";
import { COUNTRIES, DIAL_BY_NAME } from "@/lib/countries";

/** Country, then a phone number whose country code fills itself in from it. */
export function CountryPhoneFields({
  fieldClass,
  labels,
  defaults,
}: {
  fieldClass: string;
  labels: { country: string; countryPick: string; phone: string; dial: string };
  defaults?: { country?: string; dial?: string; phone?: string };
}) {
  const [dial, setDial] = useState(defaults?.dial ?? "");
  // The two phone inputs share a row, so neither may claim the full width.
  const inline = fieldClass.replace("w-full ", "");
  return (
    <>
      <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
        {labels.country}
        <select
          name="country"
          required
          defaultValue={defaults?.country ?? ""}
          autoComplete="country-name"
          onChange={(event) => setDial(DIAL_BY_NAME[event.target.value] ?? dial)}
          className={fieldClass}
        >
          <option value="" disabled>
            {labels.countryPick}
          </option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.name}>
              {country.name}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      <div className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
        <label htmlFor="signup-phone">{labels.phone}</label>
        <div className="flex gap-2">
          <input
            name="dial"
            value={dial}
            onChange={(event) => setDial(event.target.value)}
            inputMode="tel"
            aria-label={labels.dial}
            placeholder="+"
            className={`${inline} w-24 flex-none px-2 text-center`}
          />
          <input
            id="signup-phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel-national"
            defaultValue={defaults?.phone ?? ""}
            className={`${inline} min-w-0 flex-1`}
          />
        </div>
      </div>
    </>
  );
}
