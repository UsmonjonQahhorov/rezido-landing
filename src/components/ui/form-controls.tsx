import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "@/lib/cx";

/**
 * Native form controls styled to the brand. Native elements bring keyboard behaviour,
 * mobile pickers and screen-reader semantics for free, so nothing here re-implements them.
 * 44px minimum height everywhere: these are touch targets.
 */

export const FIELD_LABEL_CLASSES = "text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted";

const CONTROL_CLASSES =
  "h-11 w-full rounded-md border border-line-strong bg-surface text-[15px] text-ink transition-colors hover:border-ink-faint focus-visible:border-primary-strong disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className={FIELD_LABEL_CLASSES}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function SelectInput({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <div className="relative">
      <select {...props} className={cx(CONTROL_CLASSES, "appearance-none truncate pl-3.5 pr-10", className)}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}

export function TextInput({
  icon,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { icon?: ReactNode }) {
  return (
    <div className="relative">
      {icon ? (
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
          {icon}
        </span>
      ) : null}
      <input
        {...props}
        className={cx(CONTROL_CLASSES, "px-3.5 placeholder:text-ink-faint", icon ? "pl-10" : null, className)}
      />
    </div>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string };

/** A radio group drawn as a segmented control. Arrow keys move between options natively. */
export function SegmentedControl<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  disabled,
  size = "md",
  className,
}: {
  name: string;
  legend: string;
  options: SegmentOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <fieldset className={cx("min-w-0", className)} disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex w-full rounded-md bg-surface-muted p-1 sm:w-auto">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              "relative flex flex-1 cursor-pointer items-center justify-center rounded-[6px] px-4 font-medium text-ink-muted transition-colors sm:flex-none",
              size === "lg" ? "h-11 text-[15px]" : "h-9 text-sm",
              "hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-card",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-primary-strong",
              "has-disabled:cursor-not-allowed",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange?.(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
