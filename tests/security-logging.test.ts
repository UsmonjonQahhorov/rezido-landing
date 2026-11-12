import { NextRequest } from "next/server";
import { expect, it, vi } from "vitest";
import { GET } from "@/app/api/listings/route";

vi.mock("@/lib/listings", () => ({ searchListings: vi.fn() }));
import { searchListings } from "@/lib/listings";

it("returns generic 502 without logging upstream error contents", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(searchListings).mockRejectedValue(new Error("UPSTREAM_BODY_SENTINEL", { cause: new Error("UPSTREAM_CAUSE_SENTINEL") }));
  const response = await GET(new NextRequest("http://localhost/api/listings"));
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "listings_unavailable" });
  expect(log.mock.calls).toEqual([["[api/listings] Listing search failed"]]);
});

it.each(["javascript:alert(1)", "data:text/html,test", "https://invalid:invalid@example.test/path"])("rejects unsafe configured link %s", async (url) => {
  vi.resetModules();
  vi.stubEnv("APP_STORE_URL", url);
  vi.stubEnv("TELEGRAM_URL", url);
  const { env } = await import("@/lib/env");
  expect(env.appStoreUrl).toBeNull();
  expect(env.social.telegram).toBeNull();
});
