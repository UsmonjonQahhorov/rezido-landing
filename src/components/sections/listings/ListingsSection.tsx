import { Suspense } from "react";

import { ListingsGrid, ListingsGridSkeleton } from "@/components/property/ListingsGrid";
import { propertyLabels } from "@/components/property/labels";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getDictionary } from "@/i18n";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import type { ListingsResult } from "@/lib/listings/types";
import { SECTION_IDS } from "@/lib/site";

import { ListingsExplorer } from "./ListingsExplorer";
import { ListingsFilters } from "./ListingsFilters";

/**
 * "Ommabop takliflar" — search filters and results in one section.
 *
 * The explorer reads the URL, which a static page only knows in the browser, so it renders
 * inside Suspense. The fallback is the same layout, prerendered with the default results,
 * so the listings are in the HTML for search engines and for the first paint.
 */
export function ListingsSection({ initial }: { initial: ListingsResult | null }) {
  const dict = getDictionary();
  const labels = { ...dict.listings, som: dict.common.som };
  const cardLabels = propertyLabels(dict);
  const sectionId = SECTION_IDS.listings;

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="pb-20 pt-12 sm:pb-24 sm:pt-16">
      <div className="container-page">
        <SectionHeading
          eyebrow={dict.listings.eyebrow}
          title={dict.listings.title}
          titleId={`${sectionId}-title`}
          lead={dict.listings.lead}
          focusable
        />

        <div className="mt-10">
          <Suspense
            fallback={
              <div>
                <ListingsFilters
                  disabled
                  filters={DEFAULT_FILTERS}
                  locationDraft=""
                  canReset={false}
                  labels={labels}
                  propertyTypeLabels={dict.propertyTypes}
                />
                <div className="mt-8 min-h-5" />
                <div className="mt-5">
                  {initial && initial.results.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
                      <h3 className="font-display text-xl font-medium">{labels.emptyTitle}</h3>
                      <p className="mt-2 text-ink-muted">{labels.emptyBody}</p>
                    </div>
                  ) : initial ? (
                    <ListingsGrid listings={initial.results} labels={cardLabels} />
                  ) : (
                    <ListingsGridSkeleton />
                  )}
                </div>
              </div>
            }
          >
            <ListingsExplorer
              initial={initial}
              labels={{ ...labels, retry: dict.common.retry, loading: dict.common.loading }}
              propertyLabels={cardLabels}
              propertyTypeLabels={dict.propertyTypes}
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
