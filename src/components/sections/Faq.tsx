import { Plus } from "lucide-react";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary } from "@/i18n";
import { listingsSource } from "@/lib/listings";
import { SECTION_IDS } from "@/lib/site";

/**
 * Native `<details>` elements sharing a `name`, so opening one closes the others. They are
 * keyboard-operable and announced as expandable by screen readers with no JavaScript.
 */
export function Faq() {
  const { faq } = getDictionary();
  const sectionId = SECTION_IDS.faq;
  const items = [
    ...faq.items,
    {
      question: faq.dataQuestion,
      answer: listingsSource() === "demo" ? faq.dataAnswerDemo : faq.dataAnswerLive,
    },
  ];

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      className="border-t border-line bg-surface py-20 sm:py-28"
    >
      <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow={faq.eyebrow} title={faq.title} titleId={`${sectionId}-title`} lead={faq.lead} />
        </div>

        <div className="divide-y divide-line border-y border-line lg:col-span-8">
          {items.map((item, index) => (
            <details key={item.question} name="faq" open={index === 0} className="group">
              <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-left font-display text-lg font-medium text-ink transition-colors hover:text-primary-strong sm:text-xl">
                <h3>{item.question}</h3>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-line-strong text-ink-muted group-open:border-ink group-open:text-ink">
                  <Plus aria-hidden="true" className="size-4 transition-transform duration-200 group-open:rotate-45" />
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-14 text-[15px] leading-relaxed text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
