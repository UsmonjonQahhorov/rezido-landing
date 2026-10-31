import type { NextRequest } from "next/server";

import { searchListings } from "@/lib/listings";
import { parseFilters } from "@/lib/listings/filters";

/**
 * `GET /api/listings?listing_type=&location=&property_type=&rooms=&price_min=&price_max=&sort=`
 *
 * The browser's only door to listing data. It keeps the backend URL server-side, avoids a
 * cross-origin call from the page, and gives the explorer one shape whether the data is
 * live or demo. Failures return a generic error; backend detail stays in the server log.
 */
export async function GET(request: NextRequest) {
  const filters = parseFilters(request.nextUrl.searchParams);
  try {
    const result = await searchListings(filters);
    return Response.json(result, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[api/listings] Listing search failed", error);
    return Response.json({ error: "listings_unavailable" }, { status: 502 });
  }
}
