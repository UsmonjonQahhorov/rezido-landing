import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PHOTOS } from "@/data/photos";
import { getDictionary } from "@/i18n";
import { ROUTES, SECTION_IDS } from "@/lib/site";

export function OwnersCta() {
  const { owners } = getDictionary();
  const sectionId = SECTION_IDS.owners;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="py-20 sm:py-24">
      <div className="container-page">
        <div className="grid grid-cols-1 overflow-hidden rounded-xl bg-surface-inverse lg:grid-cols-2">
          <div className="p-6 py-10 sm:p-12 lg:p-14">
            <SectionHeading
              tone="inverse"
              eyebrow={owners.eyebrow}
              title={owners.title}
              titleId={`${sectionId}-title`}
              lead={owners.lead}
            />

            <h3 className="eyebrow mt-10 text-ink-inverse/60">{owners.checklistTitle}</h3>
            <ul className="mt-4 space-y-3">
              {owners.checklist.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-ink-inverse/90">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href={ROUTES.listProperty}
              className={buttonClasses({ variant: "primary", size: "lg", className: "mt-10" })}
            >
              {owners.cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="relative min-h-72 lg:min-h-full">
            <Image
              src={PHOTOS.tashkentCitySkyline.image}
              alt={owners.imageAlt}
              fill
              placeholder="blur"
              sizes="(min-width: 1280px) 608px, (min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
