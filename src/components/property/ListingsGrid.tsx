import { cx } from "@/lib/cx";
import type { Listing } from "@/lib/listings/types";

import type { PropertyLabels } from "./labels";
import { PropertyCard } from "./PropertyCard";

export const LISTINGS_GRID_CLASSES = "grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const THREE_COLUMN_GRID_CLASSES = "grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3";

export function ListingsGrid({
  listings,
  labels,
  maxColumns = 4,
  className,
}: {
  listings: Listing[];
  labels: PropertyLabels;
  maxColumns?: 3 | 4;
  className?: string;
}) {
  return (
    <ul className={cx(maxColumns === 3 ? THREE_COLUMN_GRID_CLASSES : LISTINGS_GRID_CLASSES, className)}>
      {listings.map((listing) => (
        <li key={`${listing.id}-${listing.listingType}`} className="flex min-w-0">
          <PropertyCard listing={listing} labels={labels} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

/** Same footprint as a card, so a loading grid does not jump when results arrive. */
export function ListingsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className={LISTINGS_GRID_CLASSES}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="aspect-[4/3] animate-pulse bg-surface-muted" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-2/3 animate-pulse rounded-sm bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded-sm bg-surface-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded-sm bg-surface-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
