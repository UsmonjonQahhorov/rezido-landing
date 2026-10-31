"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { cx } from "@/lib/cx";
import type { NavLink } from "@/lib/site";

type MobileNavProps = {
  links: NavLink[];
  cta: NavLink;
  currentLocale: Locale;
  labels: { open: string; close: string; navigation: string; language: string; soon: string };
};

/** Below `lg`: a full-height panel under the header. Escape, a link or resizing closes it. */
export function MobileNav({ links, cta, currentLocale, labels }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onBreakpoint = () => desktop.matches && setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted"
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-background"
      >
        <nav aria-label={labels.navigation} className="container-page flex min-h-full flex-col py-6">
          <ul className="divide-y divide-line border-y border-line">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="flex items-center justify-between py-4 font-display text-xl font-medium text-ink"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="size-5 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={cta.href}
            onClick={close}
            className={buttonClasses({ variant: "primary", size: "lg", className: "mt-8 w-full" })}
          >
            {cta.label}
          </Link>

          <div className="mt-auto pt-10">
            <p className="eyebrow text-ink-muted">{labels.language}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {LOCALES.map((locale) => (
                <li
                  key={locale}
                  lang={locale}
                  aria-current={locale === currentLocale ? "true" : undefined}
                  className={cx(
                    "rounded-md border px-3 py-1.5 text-sm",
                    locale === currentLocale
                      ? "border-ink bg-ink text-ink-inverse"
                      : "border-line-strong text-ink-muted",
                  )}
                >
                  {LOCALE_NAMES[locale]}
                  {locale !== currentLocale ? (
                    <span lang="uz" className="ml-1.5 font-mono text-[11px]">
                      · {labels.soon}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
