import { ArrowRight, Hand, MousePointerClick, Tag } from "lucide-react";
import Link from "next/link";

import { MapExplorer } from "@/components/map/MapExplorer";
import { propertyLabels } from "@/components/property/labels";
import { buttonClasses } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary } from "@/i18n";
import type { ListingsResult } from "@/lib/listings/types";
import { ROUTES, SECTION_IDS } from "@/lib/site";

const POINT_ICONS = [Tag, Hand, MousePointerClick];

export function MapSection({ listings }: { listings: ListingsResult | null }) {
  const dict = getDictionary();
  const { map } = dict;
  const sectionId = SECTION_IDS.map;

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-title`}
      className="border-y border-line bg-surface-muted py-20 sm:py-24"
    >
      <div className="container-page grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5 lg:pt-2">
          <SectionHeading eyebrow={map.eyebrow} title={map.title} titleId={`${sectionId}-title`} lead={map.lead} />

          <ul className="mt-10 space-y-6">
            {map.points.map((point, index) => {
              const Icon = POINT_ICONS[index] ?? Tag;
              return (
                <li key={point.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface text-primary-strong">
                    <Icon aria-hidden="true" className="size-[18px]" />
                  </span>
                  <div>
                    <h3 className="font-display text-[17px] font-medium text-ink">{point.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{point.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link href={ROUTES.map} className={buttonClasses({ variant: "primary", size: "lg", className: "mt-10" })}>
            {map.cta}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          {listings ? (
            <MapExplorer
              listings={listings.results}
              source={listings.source}
              propertyLabels={propertyLabels(dict)}
              labels={{ ...map, dealAll: dict.listings.dealAll, details: dict.common.details }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
