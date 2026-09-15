/** The two-dash tricolour mark that precedes every section label in the design. */
function EyebrowMark() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      <span className="block h-1 w-3 rounded-full bg-saffron" />
      <span className="block h-1 w-1.5 rounded-full bg-leaf" />
    </span>
  );
}

export function Eyebrow({ children, tone = "brand" }: { children: string; tone?: "brand" | "light" }) {
  return (
    <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${tone === "light" ? "text-white/70" : "text-brand-deep"}`}>
      <EyebrowMark />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  tone = "brand",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "start";
  tone?: "brand" | "light";
}) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={centered ? "flex justify-center" : ""}>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      </div>
      <h2 className={`section-title mt-3 ${tone === "light" ? "!text-white" : ""}`}>{title}</h2>
      {body ? <p className={`section-body mt-3.5 ${tone === "light" ? "!text-white/75" : ""}`}>{body}</p> : null}
    </div>
  );
}

export function Section({
  id,
  children,
  muted = false,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <section id={id} className={`${muted ? "bg-surface-muted" : "bg-surface"} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">{children}</div>
    </section>
  );
}
