import { FileText, Map as MapIcon, MessageSquareText, SlidersHorizontal, Smile } from "lucide-react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary } from "@/i18n";
import { SECTION_IDS } from "@/lib/site";

const BENEFIT_ICONS = [SlidersHorizontal, MapIcon, FileText, MessageSquareText, Smile];

export function WhyRezido() {
  const { why } = getDictionary();
  const sectionId = SECTION_IDS.why;

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      className="border-t border-line bg-surface py-20 sm:py-28"
    >
      <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow={why.eyebrow}
            title={why.title}
            titleId={`${sectionId}-title`}
            lead={why.lead}
            className="lg:sticky lg:top-28"
          />
        </div>

        <ul className="divide-y divide-line border-y border-line lg:col-span-7">
          {why.benefits.map((benefit, index) => {
            const Icon = BENEFIT_ICONS[index] ?? SlidersHorizontal;
            return (
              <li key={benefit.title} className="grid grid-cols-1 gap-3 py-7 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-6">
                <span className="flex size-11 items-center justify-center rounded-md bg-primary-muted text-primary-strong">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium text-ink">{benefit.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{benefit.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
