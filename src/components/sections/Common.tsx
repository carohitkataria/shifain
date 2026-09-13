export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "start";
}) {
  const alignment = align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl";
  return (
    <div className={alignment}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-2.5">{title}</h2>
      {body ? <p className="section-body mt-3.5">{body}</p> : null}
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
