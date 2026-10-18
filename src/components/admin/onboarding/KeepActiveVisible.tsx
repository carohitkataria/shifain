"use client";

import { useEffect } from "react";

/** On small screens the steps scroll sideways; this brings the current one into view. */
export function KeepActiveVisible() {
  useEffect(() => {
    document.querySelector('nav[aria-label="Onboarding steps"] [aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);
  return null;
}
