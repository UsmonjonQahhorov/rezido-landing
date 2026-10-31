import type { Metadata } from "next";
import Link from "next/link";

import { SimplePage } from "@/components/layout/SimplePage";
import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { SECTION_IDS } from "@/lib/site";

const dict = getDictionary();

export const metadata: Metadata = {
  title: dict.listProperty.title,
  description: dict.listProperty.description,
  alternates: { canonical: "/list-property" },
};

/**
 * Listing creation is not built yet — not in the mobile app, and not here. This page says
 * so plainly and explains what the flow will ask for; it accepts no submissions.
 */
export default function ListPropertyPage() {
  const page = dict.listProperty;
  return (
    <SimplePage eyebrow={dict.common.comingSoon} title={page.heading} lead={page.lead}>
      <ol className="mt-12 grid grid-cols-1 max-w-4xl gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
        {page.steps.map((step, index) => (
          <li key={step.title} className="bg-surface p-6">
            <span className="font-mono text-sm font-semibold text-primary-strong">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-3 font-display text-xl font-medium text-ink">{step.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/#${SECTION_IDS.listings}`} className={buttonClasses({ variant: "primary" })}>
          {page.browse}
        </Link>
        <Link href="/" className={buttonClasses({ variant: "secondary" })}>
          {dict.common.backHome}
        </Link>
      </div>
    </SimplePage>
  );
}
