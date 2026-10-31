import { interpolate, type Dictionary } from "@/i18n";
import { formatArea } from "@/lib/format";
import { districtLabel } from "@/lib/listings/filters";
import type { Listing } from "@/lib/listings/types";

/**
 * Strings a listing needs on any surface. Kept as a plain object so the same labels can be
 * handed to Client Components.
 */
export type PropertyLabels = Pick<
  Dictionary["property"],
  "forSale" | "forRent" | "verified" | "rooms" | "area" | "floorOf" | "floor" | "floorsTotal" | "locationUnknown" | "imageMissing" | "open"
> & {
  perMonth: string;
  demoBadge: string;
};

export function propertyLabels(dict: Dictionary): PropertyLabels {
  return { ...dict.property, perMonth: dict.common.perMonth, demoBadge: dict.common.demoBadge };
}

export function listingLocation(listing: Listing, labels: PropertyLabels): string {
  return (
    listing.location.address ??
    districtLabel(listing.location.district) ??
    listing.location.region ??
    labels.locationUnknown
  );
}

/** Rooms, area and floor, as measured facts: "3 xona · 78 m² · 6/9 qavat". */
export function listingFacts(listing: Listing, labels: PropertyLabels): string[] {
  const area = formatArea(listing.areaTotal);
  const facts: string[] = [];
  if (listing.rooms !== null) facts.push(interpolate(labels.rooms, { count: listing.rooms }));
  if (area) facts.push(interpolate(labels.area, { value: area }));
  if (listing.floor !== null && listing.floorsTotal !== null) {
    facts.push(interpolate(labels.floorOf, { floor: listing.floor, total: listing.floorsTotal }));
  } else if (listing.floor !== null) {
    facts.push(interpolate(labels.floor, { floor: listing.floor }));
  } else if (listing.floorsTotal !== null) {
    facts.push(interpolate(labels.floorsTotal, { count: listing.floorsTotal }));
  }
  return facts;
}
