import { describe, expect, it, vi } from "vitest";

import { fetchListing, fetchListings, ListingsUnavailableError } from "@/lib/listings/api";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import { apiRow, LISTING_ID, PROPERTY_ID } from "./fixtures";

function respond(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
function page() {
  return fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
}

describe("API adapter rent period regression", () => {
  it.each(["night", "month"])("preserves %s and distinct property/listing IDs", async (value) => {
    respond({ count: 1, results: [apiRow({ rent_period: value })] });
    const result = await page();
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ id: PROPERTY_ID, listingId: LISTING_ID, rentPeriod: { status: "known", value } });
  });
  it.each([
    ["missing", {}], ["null", { rent_period: null }], ["empty", { rent_period: "" }],
    ["unknown", { rent_period: "week" }], ["invalid_type", { rent_period: 7 }],
    ["invalid_type", { rent_period: false }], ["invalid_type", { rent_period: [] }],
    ["invalid_type", { rent_period: {} }],
  ])("distinguishes %s without inventing month", async (status, override) => {
    const row = apiRow();
    delete row.rent_period;
    respond({ count: 1, results: [{ ...row, ...(override as Record<string, unknown>) }] });
    const result = await page();
    expect(result.results[0]).toMatchObject({ rentPeriod: { status } });
    expect(result.results[0]).not.toMatchObject({ rentPeriod: { value: "month" } });
  });
  it("handles a partial row without inventing optional data", async () => {
    respond({ results: [apiRow()] });
    const result = await page();
    expect(result.results[0]).toMatchObject({ rooms: null, images: [], ownerName: null, isVerified: false });
    expect(result.count).toBe(1);
  });
  it("preserves sale and its null period", async () => {
    respond({ results: [apiRow({ listing_type: "sale", rent_period: null })] });
    expect((await page()).results[0]).toMatchObject({ listingType: "sale", rentPeriod: { status: "null" } });
  });
});

describe("partial and malformed API responses", () => {
  it("does not retain body snippets or request details in safe-to-log errors", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("UPSTREAM_BODY_SENTINEL"));
    const error: unknown = await page().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ListingsUnavailableError);
    if (!(error instanceof Error)) throw new Error("Expected failure");
    expect(error.cause).toBeUndefined();
    expect(error.message).not.toContain("UPSTREAM_BODY_SENTINEL");
  });
  it("keeps the valid row among invalid rows with safe aggregate diagnostics", async () => {
    respond({ count: 3, results: [null, apiRow(), apiRow({ title: null })] });
    const result = await page();
    expect(result.results).toHaveLength(1);
    expect(result.count).toBe(1);
    expect(result).toMatchObject({ diagnostics: { processed: 3, accepted: 1, skipped: 2, reasons: { invalid_record: 1, invalid_title: 1 } } });
    expect(JSON.stringify(result.diagnostics)).not.toContain("Regression fixture");
  });
  it("returns an honestly empty page when all rows are rejected", async () => {
    respond({ count: 2, results: [null, {}] });
    expect(await page()).toMatchObject({ count: 0, results: [], diagnostics: { processed: 2, accepted: 0, skipped: 2 } });
  });
  it("handles an empty array", async () => {
    respond({ count: 0, results: [] });
    expect(await page()).toMatchObject({ count: 0, results: [] });
  });
  it.each([null, [], {}, { results: null }, { results: {} }, { items: [] }])("rejects invalid envelope %j", async (body) => {
    respond(body);
    await expect(page()).rejects.toBeInstanceOf(ListingsUnavailableError);
  });
  it.each([
    { id: null }, { id: "not-a-property-uuid" }, { title: "" }, { listing_type: "unknown" },
    { price: null }, { price: { amount: "", currency: "UZS" } },
    { price: { amount: "  ", currency: "UZS" } }, { price: { amount: "0x10", currency: "UZS" } },
    { price: { amount: "-5", currency: "UZS" } }, { price: { amount: true, currency: "UZS" } },
    { price: { amount: "250000" } }, { price: { amount: "250000", currency: "UNKNOWN" } },
    { price: { amount: 1.234, currency: "USD" } },
    { price: { amount: "999999999999999999999", currency: "UZS" } },
  ])("does not fabricate a listing from %j", async (override) => {
    respond({ results: [apiRow(override)] });
    expect((await page()).results).toEqual([]);
  });
  it.each(["count", "next", "previous"])("allows absent pagination field %s", async (key) => {
    const body: Record<string, unknown> = { count: 1, next: null, previous: null, results: [apiRow()] };
    delete body[key];
    respond(body);
    expect((await page()).results).toHaveLength(1);
  });
  it("detail preserves rent period and uses the property URL", async () => {
    respond(apiRow());
    expect(await fetchListing("https://api.example.test/api/v1", PROPERTY_ID)).toMatchObject({ id: PROPERTY_ID, listingId: LISTING_ID, rentPeriod: { status: "known", value: "night" } });
    expect(fetch).toHaveBeenCalledWith(`https://api.example.test/api/v1/properties/${PROPERTY_ID}/`, expect.any(Object));
  });
  it("distinguishes a 404 from an invalid detail response", async () => {
    respond(null, 404);
    expect(await fetchListing("https://api.example.test/api/v1", PROPERTY_ID)).toBeNull();
    respond({});
    await expect(fetchListing("https://api.example.test/api/v1", PROPERTY_ID)).rejects.toBeInstanceOf(ListingsUnavailableError);
  });
});
