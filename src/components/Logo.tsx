import Image from "next/image";

/**
 * The ShifaIn logo. The artwork lives in brand-art.ts and is written out as
 * SVG files by scripts/brand/build-logo.mts, so pages load it once and cache
 * it rather than carrying the paths in every page's HTML.
 *
 * Intrinsic sizes are the artwork's proportions; CSS sets the actual height.
 */
const MARK = { width: 279, height: 192 };
const WORDMARK = { width: 700, height: 195 };
const STACKED = { width: 700, height: 419 };

type Tone = "light" | "dark";

const src = (name: string, tone: Tone) => `/brand/shifain-${name}${tone === "dark" ? "-dark" : ""}.svg`;

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

/** "shifaIn" with the tricolour "In". */
export function Wordmark({ className = "h-6 w-auto", tone = "light", title }: { className?: string; tone?: Tone; title?: string }) {
  return (
    <Image src={src("wordmark", tone)} alt={title ?? ""} width={WORDMARK.width} height={WORDMARK.height} className={`w-auto ${className}`} />
  );
}

/** Mark over wordmark, as on the sign — for sign-in pages and anywhere the logo stands alone. */
export function LogoStacked({ className = "h-24 w-auto", tone = "light" }: { className?: string; tone?: Tone }) {
  return (
    <Image src={src("logo", tone)} alt="ShifaIn" width={STACKED.width} height={STACKED.height} className={`w-auto ${className}`} />
  );
}

type LogoProps = {
  tagline?: string;
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  tone?: Tone;
  compact?: boolean;
};

/** Mark beside wordmark, with an optional strapline under the name. For headers and footers. */
export function Logo({ tagline, className = "", markClassName, wordmarkClassName, tone = "light", compact = false }: LogoProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName ?? (compact ? "h-9" : "h-11")} tone={tone} priority />
      <span className="flex flex-col justify-center leading-none">
        <Wordmark className={wordmarkClassName ?? (compact ? "h-5" : "h-6")} tone={tone} title="ShifaIn" />
        {tagline ? (
          <span
            className={`mt-1 hidden max-w-[15rem] text-[0.58rem] font-semibold uppercase leading-tight tracking-[0.12em] md:block ${
              tone === "dark" ? "text-white/60" : "text-ink-muted"
            }`}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
