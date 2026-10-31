import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one clay surface in a view. Pressed and hover go darker, never translucent.
  primary: "border-primary-strong bg-primary-strong text-white hover:border-primary-deep hover:bg-primary-deep",
  // Restrained: paper with a hairline and an ink label. Never a second accent colour.
  secondary: "border-line-strong bg-surface text-ink hover:bg-surface-muted",
  ghost: "border-transparent text-primary-strong hover:bg-primary-muted",
  // For dark (espresso) surfaces.
  inverse: "border-ink-inverse bg-ink-inverse text-ink hover:border-white hover:bg-white",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
};

/** Shared by `<button>` and `<Link>` so both read as the same control. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], className);
}
