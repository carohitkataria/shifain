export function Eyebrow({ children, tone = "brand" }: { children: string; tone?: "brand" | "light" }) {
  return (
    <p className={`eyebrow ${tone === "light" ? "!text-white/75" : ""}`}>
      {children}
    </p>
  );
}

/**
 * A section's heading and one line under it. Left-aligned; the label that
 * older content stores as `eyebrow` is no longer shown (see docs/design/homepage.md).
 */
export function SectionHeading({
  title,
  body,
  align = "start",
  tone = "brand",
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "center" | "start";
  tone?: "brand" | "light";
  /** A link set beside the heading on wide screens, under it on phones. */
  action?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${centered ? "text-center sm:flex-col sm:items-center" : ""}`}>
      <div className={centered ? "mx-auto max-w-3xl" : "max-w-3xl"}>
        <h2 className={`ui-h2 ${tone === "light" ? "!text-white" : ""}`}>{title}</h2>
        {body ? <p className={`ui-lead ${centered ? "mx-auto" : ""} ${tone === "light" ? "!text-white/80" : ""}`}>{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
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
    <section id={id} className={`ui-section scroll-mt-20 ${muted ? "bg-hero" : "bg-white"} ${className}`}>
      <div className="ui-container">{children}</div>
    </section>
  );
}
