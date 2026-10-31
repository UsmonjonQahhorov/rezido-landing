import {
  isListingType,
  isPropertyType,
  type Listing,
  type ListingType,
  type PropertyType,
} from "./types";

/**
 * The search state shared by the hero form, the listings explorer and the API route.
 *
 * The URL is the source of truth, so a filtered view can be shared or reloaded. Parameter
 * names deliberately match the backend's `GET /api/v1/properties/` where the concepts
 * coincide (`listing_type`, `property_type`, `rooms`, `price_min`, `price_max`, `sort`);
 * `location` is the one landing-only name, resolved server-side into `district` or `query`.
 */

export const SORT_OPTIONS = ["newest", "price_asc", "price_desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Total rooms as chips; the backend accepts 1–4, where 4 means "four or more". */
export const ROOM_OPTIONS = [1, 2, 3, 4] as const;

/** The property types offered as filters — the ones that carry residential inventory. */
export const FILTER_PROPERTY_TYPES = ["apartment", "house", "townhouse", "commercial"] as const satisfies readonly PropertyType[];

export type ListingFilters = {
  listingType: ListingType | null;
  location: string;
  propertyType: PropertyType | null;
  rooms: number[];
  /** UZS. Price filters are only meaningful within one listing type. */
  priceMin: number | null;
  priceMax: number | null;
  sort: SortOption;
};

export const DEFAULT_FILTERS: ListingFilters = {
  listingType: null,
  location: "",
  propertyType: null,
  rooms: [],
  priceMin: null,
  priceMax: null,
  sort: "newest",
};

export const LOCATION_MAX_LENGTH = 100;

/**
 * Tashkent districts as the backend stores them on `Property.district` (wire values,
 * mirrored from rezido-mobile `TASHKENT_DISTRICTS`) with their Uzbek display spelling.
 */
export const TASHKENT_DISTRICTS = [
  { value: "Chilonzor", label: "Chilonzor" },
  { value: "Yunusobod", label: "Yunusobod" },
  { value: "Mirzo Ulugbek", label: "Mirzo Ulug‘bek" },
  { value: "Yakkasaroy", label: "Yakkasaroy" },
  { value: "Shayxontohur", label: "Shayxontohur" },
  { value: "Mirobod", label: "Mirobod" },
  { value: "Sergeli", label: "Sergeli" },
  { value: "Olmazor", label: "Olmazor" },
  { value: "Uchtepa", label: "Uchtepa" },
] as const;

/** Lowercase, apostrophe-insensitive form for matching user input against place names. */
export function normaliseText(value: string): string {
  return value
    .toLocaleLowerCase("uz")
    .replace(/[‘’ʻʼ'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The backend district a free-text location names exactly, if any. */
export function matchDistrict(location: string): string | null {
  const needle = normaliseText(location).replace(/\s+tumani$/, "");
  if (!needle) return null;
  const match = TASHKENT_DISTRICTS.find(
    (district) => normaliseText(district.value) === needle || normaliseText(district.label) === needle,
  );
  return match?.value ?? null;
}

export function districtLabel(value: string | null): string | null {
  if (!value) return null;
  const match = TASHKENT_DISTRICTS.find((district) => normaliseText(district.value) === normaliseText(value));
  return match?.label ?? value;
}

// ---------------------------------------------------------------------------------------
// Price ranges
// ---------------------------------------------------------------------------------------

export type PriceRange = { min: number | null; max: number | null };

const MLN = 1_000_000;
const MLRD = 1_000_000_000;

/** Explorer ranges, in UZS. Sale and rent live on different scales, so each has its own. */
export const PRICE_RANGES: Record<ListingType, PriceRange[]> = {
  sale: [
    { min: null, max: 600 * MLN },
    { min: 600 * MLN, max: 1 * MLRD },
    { min: 1 * MLRD, max: 2 * MLRD },
    { min: 2 * MLRD, max: null },
  ],
  rent: [
    { min: null, max: 5 * MLN },
    { min: 5 * MLN, max: 8 * MLN },
    { min: 8 * MLN, max: null },
  ],
};

/** Hero budgets: an upper bound only, which is how people state a budget. */
export const BUDGETS: Record<ListingType, number[]> = {
  sale: [600 * MLN, 1 * MLRD, 1.5 * MLRD, 2.5 * MLRD],
  rent: [4 * MLN, 6 * MLN, 8 * MLN, 12 * MLN],
};

export function priceRangeKey(range: PriceRange): string {
  return `${range.min ?? ""}-${range.max ?? ""}`;
}

export function parsePriceRangeKey(key: string): PriceRange {
  const [min = "", max = ""] = key.split("-");
  return { min: toPositiveInt(min), max: toPositiveInt(max) };
}

// ---------------------------------------------------------------------------------------
// URL <-> filters
// ---------------------------------------------------------------------------------------

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function toPositiveInt(value: string | null): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

/** Lenient: anything unrecognised is dropped rather than rejected. */
export function parseFilters(source: ParamSource): ListingFilters {
  const listingType = readParam(source, "listing_type");
  const propertyType = readParam(source, "property_type");
  const sort = readParam(source, "sort");
  const rooms = (readParam(source, "rooms") ?? "")
    .split(",")
    .map(Number)
    .filter((value): value is (typeof ROOM_OPTIONS)[number] =>
      (ROOM_OPTIONS as readonly number[]).includes(value),
    );

  let priceMin = toPositiveInt(readParam(source, "price_min"));
  let priceMax = toPositiveInt(readParam(source, "price_max"));
  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }
  const parsedListingType = isListingType(listingType) ? listingType : null;

  return {
    listingType: parsedListingType,
    location: (readParam(source, "location") ?? "").trim().slice(0, LOCATION_MAX_LENGTH),
    propertyType: isPropertyType(propertyType) ? propertyType : null,
    rooms: [...new Set(rooms)].sort((a, b) => a - b),
    // A price without a listing type would compare a monthly rent with a sale price.
    priceMin: parsedListingType ? priceMin : null,
    priceMax: parsedListingType ? priceMax : null,
    sort: (SORT_OPTIONS as readonly string[]).includes(sort ?? "")
      ? (sort as SortOption)
      : DEFAULT_FILTERS.sort,
  };
}

/** Canonical query string: defaults omitted, stable key order. */
export function serializeFilters(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.listingType) params.set("listing_type", filters.listingType);
  if (filters.location.trim()) params.set("location", filters.location.trim());
  if (filters.propertyType) params.set("property_type", filters.propertyType);
  if (filters.rooms.length) params.set("rooms", filters.rooms.join(","));
  if (filters.listingType && filters.priceMin !== null) params.set("price_min", String(filters.priceMin));
  if (filters.listingType && filters.priceMax !== null) params.set("price_max", String(filters.priceMax));
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("sort", filters.sort);
  return params.toString();
}

// ---------------------------------------------------------------------------------------
// Local filtering — used for the demo dataset only. Live data is filtered by the backend.
// ---------------------------------------------------------------------------------------

function matchesLocation(listing: Listing, location: string): boolean {
  const district = matchDistrict(location);
  if (district) return normaliseText(listing.location.district ?? "") === normaliseText(district);
  const needle = normaliseText(location);
  const haystack = normaliseText(
    [listing.title, listing.location.address, listing.location.district, districtLabel(listing.location.district)]
      .filter(Boolean)
      .join(" "),
  );
  return haystack.includes(needle);
}

function matchesRooms(listing: Listing, rooms: number[]): boolean {
  if (listing.rooms === null) return false;
  const count = listing.rooms;
  return rooms.some((value) => (value === 4 ? count >= 4 : count === value));
}

export function applyFilters(listings: Listing[], filters: ListingFilters): Listing[] {
  const filtered = listings.filter((listing) => {
    if (filters.listingType && listing.listingType !== filters.listingType) return false;
    if (filters.propertyType && listing.propertyType !== filters.propertyType) return false;
    if (filters.location && !matchesLocation(listing, filters.location)) return false;
    if (filters.rooms.length && !matchesRooms(listing, filters.rooms)) return false;
    if (filters.priceMin !== null || filters.priceMax !== null) {
      // Ranges are in UZS; a listing priced in another currency cannot be compared.
      if (listing.price.currency !== "UZS") return false;
      if (filters.priceMin !== null && listing.price.amount < filters.priceMin) return false;
      if (filters.priceMax !== null && listing.price.amount > filters.priceMax) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "price_asc":
        return a.price.amount - b.price.amount;
      case "price_desc":
        return b.price.amount - a.price.amount;
      case "newest":
        return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    }
  });
}
