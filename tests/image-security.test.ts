import { expect, it, vi } from "vitest";
import { fetchListings } from "@/lib/listings/api";
import { DEFAULT_FILTERS } from "@/lib/listings/filters";
import { apiRow } from "./fixtures";

it.each(["javascript:alert(1)", "data:image/svg+xml,<svg/>", "file:///tmp/image.png", "//other.example.test/photo.jpg", "https://invalid:invalid@example.test/photo.jpg", "http:\\evil.example.test/photo.jpg"])("rejects unsafe image URL %s", async (url) => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [apiRow({ primary_image: { url } })] })));
  const result = await fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
  expect(result.results[0]?.images).toEqual([]);
});
it.each([
  ["https://cdn.example.test/photo.jpg", "https://cdn.example.test/photo.jpg"],
  ["http://localhost:9000/photo.jpg", "http://localhost:9000/photo.jpg"],
  ["/media/photo.jpg", "https://api.example.test/media/photo.jpg"],
])("preserves a safe image URL %s", async (url, expected) => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [apiRow({ primary_image: { url } })] })));
  const result = await fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
  expect(result.results[0]?.images[0]?.src).toBe(expected);
});
it("uses a valid main URL when the thumbnail is unsafe, skips malformed media", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ results: [
    apiRow({ primary_image: { thumbnail_url: "javascript:alert(1)", url: "https://cdn.example.test/photo.jpg" } }),
    apiRow({ media: [null, { url: "javascript:alert(1)" }, { url: "/media/photo.jpg", is_primary: true }] }),
  ] })));
  const result = await fetchListings("https://api.example.test/api/v1", DEFAULT_FILTERS, 12);
  expect(result.results.map((r) => r.images.length)).toEqual([1, 1]);
});
