"use client";

import { useEffect, useState } from "react";
import { WIZARD_COPY as W } from "@/lib/intake-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";

type Why = keyof typeof W.returned;

/** Why the server sent an enquiry back (?enquiry=…), at the top of the form, so a bounce is never silent. */
export function EnquiryReturned({ locale }: { locale: Locale }) {
  const [why, setWhy] = useState<Why | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("enquiry");
    if (value && value in W.returned) setWhy(value as Why);
  }, []);
  if (!why) return null;
  return (
    <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-700">
      {t(W.returned[why], locale)}
    </p>
  );
}
