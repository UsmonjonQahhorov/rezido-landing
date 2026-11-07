import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import PropertyPage, { generateMetadata } from "@/app/property/[id]/page";
import { MapExplorer } from "@/components/map/MapExplorer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { propertyLabels } from "@/components/property/labels";
import { PhonePreview } from "@/components/sections/app/PhonePreview";
import { ListingsExplorer } from "@/components/sections/listings/ListingsExplorer";
import { getDictionary } from "@/i18n";
import { fetchListings } from "@/lib/listings/api";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import { getListing } from "@/lib/listings";
import { apiRow, PROPERTY_ID } from "./fixtures";

vi.mock("@/lib/listings", () => ({ getListing: vi.fn(), getSimilarListings: vi.fn(async () => []), staticListingIds: () => [] }));
vi.mock("next/navigation", () => {
  const params = new URLSearchParams();
  return { useSearchParams: () => params, notFound: () => { throw new Error("not found"); } };
});
const dict = getDictionary();
const labels = propertyLabels(dict);

async function adapt(rows: unknown[]) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ count: rows.length, results: rows })));
  return fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
}

it.each([
  ["night", "/kechasiga"], ["month", "/oyiga"], [null, "ijara davri ko‘rsatilmagan"],
  ["", "ijara davri ko‘rsatilmagan"], ["week", "ijara davri ko‘rsatilmagan"],
  [42, "ijara davri ko‘rsatilmagan"],
])("renders period %s honestly in cards", async (rent_period, expected) => {
  const { results } = await adapt([apiRow({ rent_period })]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  render(<PropertyCard listing={listing} labels={labels} />);
  expect(screen.getByText(String(expected))).toBeDefined();
  if (rent_period !== "month") expect(screen.queryByText("/oyiga")).toBeNull();
});

it("does not attach a rental unit to a sale", async () => {
  const { results } = await adapt([apiRow({ listing_type: "sale", rent_period: null })]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  render(<PropertyCard listing={listing} labels={labels} />);
  expect(screen.queryByText("/oyiga")).toBeNull();
  expect(screen.queryByText("ijara davri ko‘rsatilmagan")).toBeNull();
});

it("carries night through detail rendering and metadata", async () => {
  const description = '<img src="x" onerror="alert(1)">';
  const { results } = await adapt([apiRow({ description })]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  vi.mocked(getListing).mockResolvedValue(listing);
  const props = { params: Promise.resolve({ id: PROPERTY_ID }), searchParams: Promise.resolve({}) };
  const { container } = render(await PropertyPage(props));
  expect(screen.getByText("/kechasiga")).toBeDefined();
  expect(screen.queryByText("/oyiga")).toBeNull();
  expect((await generateMetadata(props)).description).toContain("/kechasiga");
  expect(screen.getByText(description)).toBeDefined();
  expect(container.querySelector('img[src="x"]')).toBeNull();
});

it("keeps a missing period unspecified in the UI", async () => {
  const row = apiRow();
  delete row.rent_period;
  const { results } = await adapt([row]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  render(<PropertyCard listing={listing} labels={labels} />);
  expect(screen.getByText(dict.common.rentPeriodUnknown)).toBeDefined();
  expect(screen.queryByText("/oyiga")).toBeNull();
});

it("labels map marker accessibility, marker text, list and popup as nightly", async () => {
  const { results } = await adapt([apiRow()]);
  render(<MapExplorer listings={results} source="api" labels={{ ...dict.map, dealAll: dict.listings.dealAll, details: dict.common.details, listTitle: dict.mapPage.heading }} propertyLabels={labels} variant="page" />);
  const pin = screen.getByRole("button", { name: /Regression fixture.*kechasiga/ });
  expect(pin.textContent).toContain("/kechasiga");
  fireEvent.click(pin);
  expect(screen.getAllByText(/kechasiga/).length).toBeGreaterThanOrEqual(3);
  expect(screen.queryByText("/oyiga")).toBeNull();
  expect(screen.getByRole("link", { name: new RegExp(dict.common.details) }).getAttribute("href")).toBe(`/property/${PROPERTY_ID}`);
});

it("uses the same nightly unit in the phone preview", async () => {
  const { results } = await adapt([apiRow()]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  render(<PhonePreview listing={listing} labels={dict.app} propertyLabels={labels} />);
  expect(screen.getByText("/kechasiga")).toBeDefined();
  expect(screen.queryByText("/oyiga")).toBeNull();
});

it.each([{ rows: [null, {}] }, { rows: [null, apiRow()] }])("shows empty or valid rows after adapter filtering", async ({ rows }) => {
  const page = await adapt(rows);
  render(<ListingsExplorer initial={{ source: "api", ...page }} labels={{ ...dict.listings, som: dict.common.som, retry: dict.common.retry, loading: dict.common.loading }} propertyLabels={labels} propertyTypeLabels={dict.propertyTypes} />);
  if (page.results.length === 0) {
    expect(screen.getByText(dict.listings.emptyTitle)).toBeDefined();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  } else {
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("/kechasiga")).toBeDefined();
  }
});

it("escapes listing titles rather than interpreting user HTML", async () => {
  const title = '<script data-fixture="untrusted">alert(1)</script>';
  const { results } = await adapt([apiRow({ title })]);
  const listing = results[0];
  if (!listing) throw new Error("Valid row dropped");
  const { container } = render(<PropertyCard listing={listing} labels={labels} />);
  expect(screen.getByText(title)).toBeDefined();
  expect(container.querySelector("script")).toBeNull();
});
