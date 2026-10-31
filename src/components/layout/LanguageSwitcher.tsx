"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { interpolate } from "@/i18n";
import { AVAILABLE_LOCALES, LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { cx } from "@/lib/cx";

type LanguageSwitcherProps = {
  current: Locale;
  labels: { label: string; current: string; soon: string };
};

/**
 * A disclosure listing the three product languages. Only Uzbek exists today, so Russian
 * and English are shown — so people know they are coming — but are not links.
 */
export function LanguageSwitcher({ current, labels }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${labels.label}: ${LOCALE_NAMES[current]}`}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Globe aria-hidden="true" className="size-4" />
        <span className="font-mono text-[13px] uppercase">{current}</span>
        <ChevronDown aria-hidden="true" className={cx("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <ul
        id={listId}
        hidden={!open}
        aria-label={labels.label}
        className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-line bg-surface p-1.5 shadow-floating"
      >
        {LOCALES.map((locale) => {
          const isCurrent = locale === current;
          const isAvailable = AVAILABLE_LOCALES.includes(locale);
          return (
            <li key={locale}>
              <span
                lang={locale}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={isCurrent ? interpolate(labels.current, { language: LOCALE_NAMES[locale] }) : undefined}
                className={cx(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                  isCurrent ? "bg-surface-muted font-semibold text-ink" : "text-ink-muted",
                )}
              >
                {LOCALE_NAMES[locale]}
                {isCurrent ? (
                  <Check aria-hidden="true" className="size-4 text-primary-strong" />
                ) : !isAvailable ? (
                  <span lang="uz" className="font-mono text-[11px] text-ink-muted">
                    {labels.soon}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
