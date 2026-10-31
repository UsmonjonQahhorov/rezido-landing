import "server-only";

import { DEMO_LISTINGS } from "@/data/demo-listings";
import { env } from "@/lib/env";

import { fetchListing, fetchListings } from "./api";
import { DEFAULT_FILTERS, applyFilters, type ListingFilters } from "./filters";
import type { Listing, ListingsResult, ListingsSource } from "./types";

/**
 * The single entry point for listing data on the server.
 *
 * With `REZIDO_API_URL` set, listings come from the Rezido API and are filtered there.
 * Without it, the bundled demo dataset is filtered locally and every result is flagged
 * `isDemo`, so the UI can say so. Nothing silently falls back from one to the other: if
 * the API is configured but unreachable, callers get an error to render, not sample data
 * passed off as live.
 */

/** How many listings the landing shows at once. */
export const PAGE_SIZE = 12;

export function listingsSource(): ListingsSource {
  return env.apiUrl ? "api" : "demo";
}

export async function searchListings(
  filters: ListingFilters = DEFAULT_FILTERS,
  pageSize: number = PAGE_SIZE,
): Promise<ListingsResult> {
  if (env.apiUrl) {
    const page = await fetchListings(env.apiUrl, filters, pageSize);
    return { source: "api", ...page };
  }
  const results = applyFilters(DEMO_LISTINGS, filters);
  return { source: "demo", count: results.length, results: results.slice(0, pageSize) };
}

export async function getListing(id: string): Promise<Listing | null> {
  if (env.apiUrl) return fetchListing(env.apiUrl, id);
  return DEMO_LISTINGS.find((listing) => listing.id === id) ?? null;
}

/** Same offer type, nearest in price — a cheap and honest notion of "similar". */
export async function getSimilarListings(listing: Listing, limit = 3): Promise<Listing[]> {
  const { results } = await searchListings({ ...DEFAULT_FILTERS, listingType: listing.listingType });
  return results
    .filter((candidate) => candidate.id !== listing.id)
    .sort(
      (a, b) =>
        Math.abs(a.price.amount - listing.price.amount) - Math.abs(b.price.amount - listing.price.amount),
    )
    .slice(0, limit);
}

/** Demo pages are prerendered at build time; live listings render on first request. */
export function staticListingIds(): string[] {
  return env.apiUrl ? [] : DEMO_LISTINGS.map((listing) => listing.id);
}
