import { Info } from "lucide-react";
import type { Metadata } from "next";

import { SimplePage } from "@/components/layout/SimplePage";
import { MapExplorer } from "@/components/map/MapExplorer";
import { propertyLabels } from "@/components/property/labels";
import { getDictionary } from "@/i18n";
import { searchListings } from "@/lib/listings";

export const revalidate = 300;

const dict = getDictionary();

export const metadata: Metadata = {
  title: dict.mapPage.title,
  description: dict.mapPage.description,
  alternates: { canonical: "/map" },
};

export default async function MapPage() {
  const listings = await searchListings().catch(() => null);

  return (
    <SimplePage eyebrow={dict.map.eyebrow} title={dict.mapPage.heading} lead={dict.mapPage.lead}>
      <p className="mt-6 flex max-w-3xl items-start gap-2.5 rounded-lg border border-line-strong bg-surface-muted px-4 py-3 text-sm text-ink">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
        {dict.mapPage.note}
      </p>

      <div className="mt-10">
        {listings ? (
          <MapExplorer
            variant="page"
            listings={listings.results}
            source={listings.source}
            propertyLabels={propertyLabels(dict)}
            labels={{
              ...dict.map,
              dealAll: dict.listings.dealAll,
              details: dict.common.details,
              listTitle: dict.mapPage.listTitle,
            }}
          />
        ) : (
          <p role="alert" className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center text-ink-muted">
            {dict.listings.errorTitle}. {dict.listings.errorBody}
          </p>
        )}
      </div>
    </SimplePage>
  );
}
