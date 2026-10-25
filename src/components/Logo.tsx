import Image from "next/image";

/**
 * The ShifaIn logo: the lotus, aircraft and cross, the "shifain" wordmark
 * with its orange i and green n, and the "Trusted medical journey" strapline.
 * The files are cut from the approved artwork by scripts/brand/build-logo.mts.
 *
 * Intrinsic sizes are the files' proportions; CSS sets the actual height.
 */
const MARK = { width: 347, height: 240 };
const WORDMARK = { width: 520, height: 150 };
const FULL = { width: 1250, height: 300 };

type Tone = "light" | "dark";

const src = (name: string, tone: Tone) => `/brand/shifain-${name}${tone === "dark" ? "-dark" : ""}.png`;

/** The lotus, swoosh, aircraft and cross on their own. */
export function LogoMark({
  className = "h-10 w-auto",
  title,
  tone = "light",
  priority = false,
}: {
  className?: string;
  title?: string;
  tone?: Tone;
  priority?: boolean;
}) {
  return (
    <Image
      src={src("mark", tone)}
      alt={title ?? ""}
      width={MARK.width}
      height={MARK.height}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}

/** "shifain" with the orange i and green n. */
export function Wordmark({
  className = "h-6 w-auto",
  tone = "light",
  title,
  priority = false,
}: {
  className?: string;
  tone?: Tone;
  title?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src("wordmark", tone)}
      alt={title ?? ""}
      width={WORDMARK.width}
      height={WORDMARK.height}
      priority={priority}
      className={`w-auto ${className}`}
    />
  );
}

/** The whole logo, strapline included — for sign-in pages and anywhere the logo stands alone. */
export function LogoStacked({ className = "h-24 w-auto", tone = "light" }: { className?: string; tone?: Tone }) {
  return <Image src={src("logo", tone)} alt="ShifaIn" width={FULL.width} height={FULL.height} className={`w-auto ${className}`} />;
}

type LogoProps = {
  tagline?: string;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  tone?: Tone;
  compact?: boolean;
};

/** Mark beside wordmark, with the strapline under the name. For headers and footers. */
export function Logo({ tagline, className = "", markClassName, wordmarkClassName, tone = "light", compact = false }: LogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName ?? (compact ? "h-9" : "h-12")} tone={tone} priority />
      <span className="flex flex-col justify-center leading-none">
        {/* self-start: in this column a longer strapline would otherwise stretch the wordmark sideways. */}
        <Wordmark className={`self-start ${wordmarkClassName ?? (compact ? "h-6" : "h-8")}`} tone={tone} title="ShifaIn" priority />
        {tagline ? (
          <span
            className={`mt-1 hidden whitespace-nowrap text-[0.6rem] font-semibold uppercase leading-none tracking-[0.2em] md:block ${
              tone === "dark" ? "text-white/70" : "text-[#5f7393]"
            }`}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
