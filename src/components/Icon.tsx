import type { JSX } from "react";

/** Line icons used by the star clusters, the journey path and the planner. */
const PATHS: Record<string, JSX.Element> = {
  spark: (
    <>
      <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
      <path d="M12 8.5 13.4 11l2.6 1-2.6 1-1.4 2.5L10.6 13 8 12l2.6-1z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  translate: (
    <>
      <path d="M3 6h9M7.5 4v2M10 6c0 3.6-2.6 6.8-6 8" />
      <path d="M5 10.5c1.3 2 3.2 3.5 5.5 4.2" />
      <path d="m13 20 3.5-9 3.5 9M14.4 17.2h4.2" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8.2 6H13a3.5 3.5 0 0 1 0 7h-2a3.5 3.5 0 0 0 0 7h4.8" />
    </>
  ),
  hospital: (
    <>
      <path d="M4 20V9.5L12 5l8 4.5V20z" />
      <path d="M12 9.8v5.4M9.3 12.5h5.4" />
      <path d="M9.5 20v-3.2h5V20" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20H4z" />
      <path d="M9.8 20v-5.2h4.4V20" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M8.2 7.8 12 4l3.8 3.8" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  stethoscope: (
    <>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M6 3H4.5M14 3h1.5" />
      <path d="M10 12v2.5a4.5 4.5 0 0 0 9 0V13" />
      <circle cx="19" cy="11" r="2" />
    </>
  ),
  plane: (
    <>
      <path d="M20 15.5v-1.8l-6.5-4V4.4a1.5 1.5 0 0 0-3 0v5.3L4 13.7v1.8l6.5-2v4.1L8.8 18.8V20l2.7-.8 2.7.8v-1.2l-1.7-1.2v-4.1z" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V6a1.5 1.5 0 0 0-1.5-1.5H15" />
      <rect x="9" y="3" width="6" height="3.2" rx="1" />
      <path d="M9.2 11h5.6M9.2 14.5h3.6" />
    </>
  ),
  bed: (
    <>
      <path d="M3 18v-7M3 14h18v4M21 18v-4.5a2.5 2.5 0 0 0-2.5-2.5H11v3.5" />
      <circle cx="7" cy="11.5" r="2" />
    </>
  ),
  car: (
    <>
      <path d="M4.5 16.5h15M5 16.5v2M19 16.5v2" />
      <path d="M4.5 16.5 6 11h12l1.5 5.5" />
      <path d="M3.5 13.5h17" />
      <circle cx="8" cy="16.5" r="1.4" />
      <circle cx="16" cy="16.5" r="1.4" />
    </>
  ),
  visa: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="10" cy="10" r="2.2" />
      <path d="M6.5 16.5c.7-1.7 2-2.6 3.5-2.6s2.8.9 3.5 2.6M14.5 8.5h3.2M14.5 11.5h3.2" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M6.5 14.5h3.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chat: (
    <>
      <path d="M20 12.5a7 7 0 0 1-7 7H8l-4 2.5.9-3.6A7 7 0 0 1 11 5.5h2a7 7 0 0 1 7 7z" />
      <path d="M9 12h6M9 9h4" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
      <path d="M4.8 12.5h3.4l1.6-2.5 2.4 5 1.6-2.5h5.4" />
    </>
  ),
  ribbon: (
    <>
      <path d="M12 3.5c2.1 0 3.6 1.6 3.6 3.6 0 2.5-2.2 4.9-3.6 6.5-1.4-1.6-3.6-4-3.6-6.5 0-2 1.5-3.6 3.6-3.6z" />
      <path d="m9.6 11.2-4.1 8.3 3-.7 1.4 2.7 4-8.3M14.4 11.2l4.1 8.3-3-.7-1.4 2.7-2.1-4.3" />
    </>
  ),
  bone: (
    <>
      <path d="M8.5 15.5 15.5 8.5" />
      <path d="M15.5 8.5a2.3 2.3 0 1 1 2.4-3.9 2.3 2.3 0 1 1 1.5 4.4 2.3 2.3 0 0 1-3.9-.5zM8.5 15.5a2.3 2.3 0 1 1-2.4 3.9 2.3 2.3 0 1 1-1.5-4.4 2.3 2.3 0 0 1 3.9.5z" />
    </>
  ),
  brain: (
    <>
      <path d="M12 5.5v13M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.3A3 3 0 0 0 7.5 18 2.5 2.5 0 0 0 12 18.5" />
      <path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.3A3 3 0 0 1 16.5 18 2.5 2.5 0 0 1 12 18.5M12 5.5a2.6 2.6 0 0 0-3-1M12 5.5a2.6 2.6 0 0 1 3-1M8 11h2M14 11h2" />
    </>
  ),
  organ: (
    <>
      <path d="M9.5 4.5c-3 0-5 2.6-5 6.4 0 4.2 2.4 8.6 5.2 8.6 1.7 0 2.3-1.4 2.3-3.4V8.6c0-2.3-.8-4.1-2.5-4.1z" />
      <path d="M14.5 4.5c3 0 5 2.6 5 6.4 0 4.2-2.4 8.6-5.2 8.6-1.7 0-2.3-1.4-2.3-3.4" />
    </>
  ),
  baby: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.3 11h.01M14.7 11h.01M9.5 14.6c1.4 1.2 3.6 1.2 5 0M12 3.5c-1.2 1-1.2 2.4 0 3" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <circle cx="16.8" cy="9.5" r="2.3" />
      <path d="M16.5 14.4c2.2.1 3.7 1.6 4.1 4" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5.2" />
      <path d="m9.2 13.4-1.4 7 4.2-2.3 4.2 2.3-1.4-7" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4 17 4.8-4.5 3.4 3 2.8-2.5L20 17.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
};

/** The few emoji older content used as icons, drawn as line icons instead. */
const FROM_EMOJI: Record<string, string> = {
  "❤️": "heart",
  "🫀": "heart",
  "🎗️": "ribbon",
  "🦴": "bone",
  "🦵": "bone",
  "🧠": "brain",
  "🩺": "organ",
  "👶": "baby",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const path = PATHS[name] ?? PATHS[FROM_EMOJI[name] ?? ""] ?? PATHS.spark;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
