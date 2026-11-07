import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { PropertyCard } from "@/components/property/PropertyCard";
import { propertyLabels } from "@/components/property/labels";
import { getDictionary } from "@/i18n";
import { fetchListings } from "@/lib/listings/api";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import { apiRow } from "./fixtures";

it("renders a nightly API price as nightly, never monthly (original bug)", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ count: 1, results: [apiRow()] })));
  const { results } = await fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
  const listing = results[0];
  if (!listing) throw new Error("Valid fixture was dropped");
  render(<PropertyCard listing={listing} labels={propertyLabels(getDictionary())} />);
  expect(screen.queryByText("/oyiga")).toBeNull();
  expect(screen.getByText("/kechasiga")).toBeDefined();
});
