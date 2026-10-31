import "server-only";

import { matchDistrict, type ListingFilters } from "./filters";
import {
  CURRENCIES,
  FURNISHING_STATES,
  RENOVATION_TYPES,
  isListingType,
  isPropertyType,
  type Currency,
  type FurnishingState,
  type Listing,
  type ListingImage,
  type RenovationType,
} from "./types";

/**
 * Client for the public marketplace endpoints of rezido-backend.
 *
 *   GET {REZIDO_API_URL}/properties/        MarketplaceListView   (AllowAny, paginated)
 *   GET {REZIDO_API_URL}/properties/{uuid}/ MarketplaceDetailView (AllowAny)
 *
 * Query parameters follow `MarketplaceSearchSerializer`; response fields follow
 * `MarketplaceListingSerializer`. Responses are parsed defensively: a row missing what a
 * card needs is skipped, and unknown enum values degrade instead of failing the page.
 * Backend error text is never surfaced — callers get `ListingsUnavailableError`.
 */

const REQUEST_TIMEOUT_MS = 8_000;
/** Listing data tolerates a minute of staleness, as in the mobile app. */
const REVALIDATE_SECONDS = 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ListingsUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ListingsUnavailableError";
  }
}

// ---------------------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------------------

function toSearchParams(filters: ListingFilters, pageSize: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.listingType) params.set("listing_type", filters.listingType);
  if (filters.propertyType) params.append("property_type", filters.propertyType);
  for (const rooms of filters.rooms) params.append("rooms", String(rooms));

  if (filters.location) {
    // A recognised district uses the indexed district filter; anything else is free text
    // over title and address.
    const district = matchDistrict(filters.location);
    if (district) params.set("district", district);
    else params.set("query", filters.location);
  }

  if (filters.priceMin !== null || filters.priceMax !== null) {
    // The ranges are UZS. Without the currency, a $80,000 flat would match "600 mln gacha".
    params.set("currency", "UZS");
    if (filters.priceMin !== null) params.set("price_min", String(filters.priceMin));
    if (filters.priceMax !== null) params.set("price_max", String(filters.priceMax));
  }

  params.set("sort", filters.sort);
  params.set("page_size", String(pageSize));
  return params;
}

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": "uz" },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ListingsUnavailableError("Rezido API request failed", { cause: error });
  }
  if (response.status === 404) return { status: 404, body: null };
  if (!response.ok) throw new ListingsUnavailableError(`Rezido API responded ${response.status}`);
  try {
    return { status: response.status, body: await response.json() };
  } catch (error) {
    throw new ListingsUnavailableError("Rezido API returned invalid JSON", { cause: error });
  }
}

export async function fetchListings(
  apiUrl: string,
  filters: ListingFilters,
  pageSize: number,
): Promise<{ count: number; results: Listing[] }> {
  const { body } = await getJson(`${apiUrl}/properties/?${toSearchParams(filters, pageSize)}`);
  const page = asRecord(body);
  if (!page || !Array.isArray(page.results)) {
    throw new ListingsUnavailableError("Rezido API returned an unexpected page shape");
  }
  const results = page.results.map(toListing).filter((listing): listing is Listing => listing !== null);
  return { count: asNumber(page.count) ?? results.length, results };
}

export async function fetchListing(apiUrl: string, id: string): Promise<Listing | null> {
  // The detail route only matches UUIDs; anything else is a guaranteed 404.
  if (!UUID_PATTERN.test(id)) return null;
  const { status, body } = await getJson(`${apiUrl}/properties/${id}/`);
  return status === 404 ? null : toListing(body);
}

// ---------------------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------------------

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** DRF serialises decimals as strings; accept both. */
function asNumber(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function asEnum<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : null;
}

function toImage(value: unknown, preferThumbnail: boolean): ListingImage | null {
  const media = asRecord(value);
  if (!media) return null;
  const src = (preferThumbnail && asString(media.thumbnail_url)) || asString(media.url);
  if (!src) return null;
  return {
    src,
    width: asNumber(media.width) ?? 1280,
    height: asNumber(media.height) ?? 960,
    alt: null,
    remote: true,
  };
}

function toImages(record: JsonRecord): ListingImage[] {
  if (Array.isArray(record.media) && record.media.length > 0) {
    const ordered = [...record.media]
      .map(asRecord)
      .filter((media): media is JsonRecord => media !== null)
      .sort(
        (a, b) =>
          Number(b.is_primary === true) - Number(a.is_primary === true) ||
          (asNumber(a.sort_order) ?? 0) - (asNumber(b.sort_order) ?? 0),
      );
    return ordered.map((media) => toImage(media, false)).filter((image): image is ListingImage => image !== null);
  }
  const primary = toImage(record.primary_image, true);
  return primary ? [primary] : [];
}

function toListing(value: unknown): Listing | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = asString(record.id);
  const title = asString(record.title);
  const listingType = record.listing_type;
  const price = asRecord(record.price);
  const amount = asNumber(price?.amount);
  if (!id || !title || !isListingType(listingType) || amount === null) return null;

  const location = asRecord(record.location);
  const point = asRecord(location?.point);
  const latitude = asNumber(point?.latitude);
  const longitude = asNumber(point?.longitude);
  const owner = asRecord(record.owner);

  return {
    id,
    title,
    listingType,
    propertyType: isPropertyType(record.property_type) ? record.property_type : "other",
    price: { amount, currency: asEnum<Currency>(CURRENCIES, price?.currency) ?? "UZS" },
    rooms: asNumber(record.rooms),
    areaTotal: asNumber(record.area_total),
    floor: asNumber(record.floor),
    floorsTotal: asNumber(record.floors_total),
    location: {
      district: asString(location?.district),
      address: asString(location?.address),
      region: asString(location?.region),
      point: latitude !== null && longitude !== null ? { latitude, longitude } : null,
    },
    images: toImages(record),
    description: asString(record.description) ?? "",
    renovation: asEnum<RenovationType>(RENOVATION_TYPES, record.renovation),
    furnishing: asEnum<FurnishingState>(FURNISHING_STATES, record.furnishing),
    isVerified: record.is_verified === true,
    publishedAt: asString(record.published_at),
    ownerName: asString(owner?.first_name),
    isDemo: false,
  };
}
