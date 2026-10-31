import { cx } from "@/lib/cx";

type WordmarkProps = {
  size?: "sm" | "lg";
  tone?: "ink" | "inverse";
  className?: string;
};

/**
 * The wordmark, as rezido-mobile renders it (`components/ui/Wordmark.tsx`): lowercase
 * "rezido" in Space Grotesk beside the brand's single lit edge.
 *
 * The full mark — an isometric building outline with one brass-lit edge — has no asset
 * yet, so, like the app, a single tilted clay square stands in for it. One, never two.
 */
export function Wordmark({ size = "sm", tone = "ink", className }: WordmarkProps) {
  const large = size === "lg";
  return (
    <span className={cx("inline-flex items-center", large ? "gap-2.5" : "gap-2", className)}>
      <span
        aria-hidden="true"
        className={cx("shrink-0 rotate-45 bg-primary", large ? "size-3 rounded-[2px]" : "size-2 rounded-[1px]")}
      />
      <span
        className={cx(
          "font-display font-bold leading-none tracking-[-0.035em]",
          large ? "text-[30px]" : "text-[23px]",
          tone === "inverse" ? "text-ink-inverse" : "text-ink",
        )}
      >
        rezido
      </span>
    </span>
  );
}
