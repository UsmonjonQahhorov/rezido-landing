import { expect, it, vi } from "vitest";
import { fetchListings } from "@/lib/listings/api";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import { pricesComparable } from "@/lib/listings/types";
import { formatPrice } from "@/lib/format";
import { apiRow } from "./fixtures";

it("does not compare monthly and nightly rates or different currencies", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [apiRow(), apiRow({ rent_period: "month" }), apiRow({ price: { amount: "25.50", currency: "USD" } }), apiRow({ rent_period: null })] })));
  const { results } = await fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
  const [night, month, usd, unknown] = results;
  if (!night || !month || !usd || !unknown) throw new Error("Valid fixture dropped");
  expect(pricesComparable(night, night)).toBe(true);
  expect(pricesComparable(night, month)).toBe(false);
  expect(pricesComparable(night, usd)).toBe(false);
  expect(pricesComparable(unknown, unknown)).toBe(false);
});

it.each([
  [0, "USD", "$0"], [100.5, "USD", "$100,5"], [100.51, "EUR", "€100,51"],
  [250000, "UZS", "250\u00a0000\u00a0so‘m"], [-5, "UZS", "—"],
] as const)("formats %s %s without inventing money", (amount, currency, expected) => {
  expect(formatPrice({ amount, currency })).toBe(expected);
});
