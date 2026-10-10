export function Eyebrow({ children, tone = "brand" }: { children: string; tone?: "brand" | "light" }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${tone === "light" ? "text-white/70" : "text-brand-deep"}`}>
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
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
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
    <section id={id} className={`${muted ? "bg-surface-muted" : "bg-white"} ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">{children}</div>
    </section>
  );
}
