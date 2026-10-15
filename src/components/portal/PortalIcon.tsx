/** Line icons for the patient portal, drawn on a 24px grid at the current text colour. */
const PATHS: Record<string, React.ReactNode> = {
  overview: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  plan: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" />
      <path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 7.5h6l2 2h8v9.5a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5z" />
      <path d="M12 12.5v5M9.8 14.7 12 12.5l2.2 2.2" />
    </>
  ),
  schedule: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4M8 13.5h2M11 13.5h2M14 13.5h2M8 16.5h2M11 16.5h2" />
    </>
  ),
  translator: (
    <>
      <path d="M3.5 6h9M8 4v2M10.5 6c0 3.6-2.6 6.8-6 8" />
      <path d="M5.5 10.5c1.3 2 3.2 3.5 5.5 4.2" />
      <path d="m13 20 3.5-9 3.5 9M14.4 17.2h4.2" />
    </>
  ),
  history: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4 4.5v3.5h3.5M12 8v4.3l2.8 1.7" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8h.01" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c1.1-3.6 4-5.5 7.2-5.5s6.1 1.9 7.2 5.5" />
    </>
  ),
  chat: (
    <>
      <path d="M12 4c4.7 0 8 3.1 8 7s-3.3 7-8 7c-1 0-1.9-.1-2.7-.4L5 19.5l1.2-3.4C4.8 14.8 4 13 4 11c0-3.9 3.3-7 8-7z" />
    </>
  ),
  phone: <path d="M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4z" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z" />
      <path d="M9.2 8.6c.3-.6.9-.6 1.1 0l.6 1.4c.1.3 0 .6-.2.8l-.4.4c.6 1.2 1.5 2.1 2.7 2.7l.4-.4c.2-.2.5-.3.8-.2l1.4.6c.6.2.6.8 0 1.1-.9.6-2 .7-3 .2a8 8 0 0 1-3.6-3.6c-.5-1-.4-2.1.2-3z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="m5.5 12.5 4 4 9-9" />,
  upload: (
    <>
      <path d="M12 15.5V5M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 15v3.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V15" />
    </>
  ),
  download: (
    <>
      <path d="M12 4.5V15M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 15v3.5c0 .8.7 1.5 1.5 1.5h11c.8 0 1.5-.7 1.5-1.5V15" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" />
      <path d="M14 3.5V8h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  swap: <path d="M7 7.5h12M15.5 4 19 7.5 15.5 11M17 16.5H5M8.5 13 5 16.5 8.5 20" />,
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
    </>
  ),
  plane: <path d="M21 4.2c-.6-.6-1.7-.6-2.5.1L14.7 8 5.8 5.4 4 7.2l7.2 4.2-3.5 3.6-2.6-.4-1.4 1.4 3.4 1.9 1.9 3.4 1.4-1.4-.4-2.6 3.6-3.5 4.2 7.2 1.8-1.8-2.6-8.9 3.7-3.8c.7-.8.7-1.9.1-2.5z" />,
};

export function PortalIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.file}
    </svg>
  );
}
