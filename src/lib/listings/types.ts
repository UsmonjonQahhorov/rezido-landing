/**
 * The listing shape the landing renders.
 *
 * It is a camelCase projection of `MarketplaceListingSerializer` in rezido-backend (the
 * same contract rezido-mobile mirrors in `src/types/property.ts`). Demo data and API
 * responses are both mapped into it, so no component knows where a listing came from
 * except through the explicit `isDemo` flag.
 *
 * Enumerations mirror the backend's Django `TextChoices`; values are wire values and are
 * labelled through the dictionary, never displayed raw.
 */

/** `apps/listings/models.py::ListingType`. */
export const LISTING_TYPES = ["sale", "rent"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

/** `apps/properties/models.py::PropertyType`. */
export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "townhouse",
  "room",
  "land",
  "commercial",
  "garage",
  "dacha",
  "other",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** `apps/properties/models.py::RenovationType`. */
export const RENOVATION_TYPES = [
  "rough",
  "needs_repair",
  "cosmetic",
  "euro",
  "designer",
  "other",
] as const;
export type RenovationType = (typeof RENOVATION_TYPES)[number];

/** `apps/properties/models.py::FurnishingState`. */
export const FURNISHING_STATES = ["furnished", "partially_furnished", "unfurnished"] as const;
export type FurnishingState = (typeof FURNISHING_STATES)[number];

/** `apps/common/choices.py::Currency`. */
export const CURRENCIES = ["UZS", "USD", "EUR", "RUB"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Money = { amount: number; currency: Currency };

/** Preserve why a period is unavailable; never silently promote it to month. */
export type RentPeriod =
  | { status: "known"; value: "night" | "month" }
  | { status: "missing" | "null" | "empty" | "unknown" | "invalid_type" };

export type ListingSkipReason = "invalid_record" | "invalid_id" | "invalid_title" | "invalid_listing_type" | "invalid_price";
export type ListingDiagnostics = {
  processed: number;
  accepted: number;
  skipped: number;
  reasons: Partial<Record<ListingSkipReason, number>>;
  rentPeriods: Partial<Record<RentPeriod["status"], number>>;
};

export type GeoPoint = { latitude: number; longitude: number };

export type ListingImage = {
  src: string;
  width: number;
  height: number;
  /** Present for bundled photographs; drives the blur-up placeholder. */
  blurDataURL?: string;
  /** Describes what the photograph shows. Falls back to the listing title when absent. */
  alt: string | null;
  /** Served by the Rezido media host rather than bundled with the site. */
  remote: boolean;
};

export type Listing = {
  /** Property UUID, used by /properties/{id}/ and the detail URL. */
  id: string;
  /** Marketplace offer UUID; never substitute the property id for a booking. */
  listingId: string | null;
  title: string;
  listingType: ListingType;
  rentPeriod: RentPeriod;
  propertyType: PropertyType;
  price: Money;
  rooms: number | null;
  areaTotal: number | null;
  floor: number | null;
  floorsTotal: number | null;
  location: {
    district: string | null;
    address: string | null;
    region: string | null;
    point: GeoPoint | null;
  };
  /** Ordered; the first image is the primary one. May be empty. */
  images: ListingImage[];
  description: string;
  renovation: RenovationType | null;
  furnishing: FurnishingState | null;
  /** The backend sets this from the OWNER's identity verification. Never set on demo data. */
  isVerified: boolean;
  publishedAt: string | null;
  ownerName: string | null;
  /** Sample content written for the landing page, not an offer anyone made. */
  isDemo: boolean;
};

export type ListingsSource = "api" | "demo";

export type ListingsResult = {
  source: ListingsSource;
  /** Server total when the page is valid; accepted page count if rows were rejected. */
  count: number;
  results: Listing[];
  /** Aggregate counters only; no payloads, IDs, URLs or user text. Live API pages only. */
  diagnostics?: ListingDiagnostics;
};

export function isListingType(value: unknown): value is ListingType {
  return typeof value === "string" && (LISTING_TYPES as readonly string[]).includes(value);
}

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === "string" && (PROPERTY_TYPES as readonly string[]).includes(value);
}

/** Nearest-price suggestions must compare the same currency and rental unit. */
export function pricesComparable(a: Listing, b: Listing): boolean {
  if (a.listingType !== b.listingType || a.price.currency !== b.price.currency) return false;
  return a.listingType === "sale" || (a.rentPeriod.status === "known" && b.rentPeriod.status === "known" && a.rentPeriod.value === b.rentPeriod.value);
}
