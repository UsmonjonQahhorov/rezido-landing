import { Columns3, KeyRound, MapPinned } from "lucide-react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary } from "@/i18n";
import { SECTION_IDS } from "@/lib/site";

const STEP_ICONS = [MapPinned, Columns3, KeyRound];

export function HowItWorks() {
  const { howItWorks } = getDictionary();
  const sectionId = SECTION_IDS.howItWorks;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow={howItWorks.eyebrow}
          title={howItWorks.title}
          titleId={`${sectionId}-title`}
          lead={howItWorks.lead}
        />

        <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {howItWorks.steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? MapPinned;
            return (
              <li key={step.title} className="border-t border-ink pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-primary-strong">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon aria-hidden="true" className="size-5 text-ink-muted" />
                </div>
                <h3 className="mt-8 font-display text-2xl font-bold tracking-[-0.02em] text-ink">{step.title}</h3>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
