import type { ListingsResult } from "./types";

/** Browser-side call to `/api/listings`. The query string comes from `serializeFilters`. */
export async function requestListings(query: string, signal: AbortSignal): Promise<ListingsResult> {
  const response = await fetch(query ? `/api/listings?${query}` : "/api/listings", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Listings request failed with ${response.status}`);
  return (await response.json()) as ListingsResult;
}
