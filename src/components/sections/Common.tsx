export function Eyebrow({ children, tone = "brand" }: { children: string; tone?: "brand" | "light" }) {
  return (
    <p className={`eyebrow ${tone === "light" ? "!text-white/75" : ""}`}>
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
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2 className={`section-title mt-3 ${tone === "light" ? "!text-white" : ""}`}>{title}</h2>
      {body ? <p className={`section-body mt-4 ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"} ${tone === "light" ? "!text-white/80" : ""}`}>{body}</p> : null}
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
    <section id={id} className={`scroll-mt-20 ${muted ? "bg-hero" : "bg-white"} ${className}`}>
      <div className="mx-auto max-w-[88rem] px-4 py-20 sm:px-6 lg:px-12 lg:py-28">{children}</div>
    </section>
  );
}
