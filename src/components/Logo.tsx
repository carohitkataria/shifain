type LogoMarkProps = { className?: string; title?: string };

/**
 * The ShifaIn mark: a lotus opening into a tricolour swoosh, an aircraft
 * climbing away from it, and a hospital — a building carrying the care cross,
 * rather than a bare medical plus.
 */
export function LogoMark({ className = "h-10 w-10", title }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}

      {/* Lotus petals, opening from a single base point. */}
      <g fill="none" stroke="#1a7ec4" strokeWidth="3.4" strokeLinejoin="round">
        <ellipse cx="31" cy="34" rx="7" ry="19" transform="rotate(-68 31 54)" />
        <ellipse cx="31" cy="33" rx="7" ry="20" transform="rotate(-40 31 54)" />
        <ellipse cx="31" cy="37" rx="6" ry="16" transform="rotate(48 31 54)" />
      </g>

      {/* Leaf and tricolour swoosh at the heart of the lotus. */}
      <ellipse cx="31" cy="31" rx="6.4" ry="22" transform="rotate(-13 31 54)" fill="#34a04a" />
      <ellipse cx="31" cy="32" rx="3.6" ry="20.5" transform="rotate(-6 31 54)" fill="#ffffff" />
      <ellipse cx="31" cy="32" rx="3.1" ry="20" transform="rotate(-1 31 54)" fill="#f08c1e" />

      {/* Aircraft climbing away from the lotus. */}
      <g transform="translate(36 1) rotate(38 12 12)">
        <path
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          fill="#1a7ec4"
        />
      </g>

      {/* Hospital: a building carrying the care cross. */}
      <g>
        <path d="M41.5 47.8 51 41.2 60.5 47.8Z" fill="#2b8c3e" />
        <rect x="43" y="47.2" width="16" height="14.2" rx="2" fill="#34a04a" />
        <path d="M49.1 50h3.8v2.9h2.9v3.8h-2.9v2.9h-3.8v-2.9h-2.9v-3.8h2.9z" fill="#ffffff" />
      </g>
    </svg>
  );
}

type LogoProps = {
  tagline?: string;
  className?: string;
  markClassName?: string;
  compact?: boolean;
};

export function Logo({ tagline, className = "", markClassName, compact = false }: LogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName ?? (compact ? "h-9 w-9" : "h-11 w-11")} title="ShifaIn" />
      <span className="flex flex-col leading-none">
        <span
          className={`font-extrabold tracking-tight text-ink ${compact ? "text-lg" : "text-xl"}`}
        >
          shifa<span className="text-brand">in</span>
        </span>
        {tagline ? (
          <span className="mt-1 max-w-[15rem] text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.12em] text-ink-muted">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
