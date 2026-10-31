import { cx } from "@/lib/cx";

type SectionHeadingProps = {
  /** Mono section marker, e.g. "02 — Xarita". */
  eyebrow?: string;
  title: string;
  /** Lets the section reference its heading with `aria-labelledby`. */
  titleId?: string;
  lead?: string;
  tone?: "ink" | "inverse";
  className?: string;
  /** Focusable so in-page navigation can move focus to the section it scrolled to. */
  focusable?: boolean;
};

export function SectionHeading({
  eyebrow,
  title,
  titleId,
  lead,
  tone = "ink",
  className,
  focusable = false,
}: SectionHeadingProps) {
  const inverse = tone === "inverse";
  return (
    <div className={cx("max-w-2xl", className)}>
      {eyebrow ? (
        <p className={cx("eyebrow", inverse ? "text-primary-on-dark" : "text-primary-strong")}>{eyebrow}</p>
      ) : null}
      <h2
        id={titleId}
        tabIndex={focusable ? -1 : undefined}
        className={cx(
          "mt-4 font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.03em] text-balance focus:outline-none sm:text-[2.6rem]",
          inverse ? "text-ink-inverse" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p
          className={cx(
            "mt-4 text-[17px] leading-relaxed text-pretty",
            inverse ? "text-ink-inverse/75" : "text-ink-muted",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
