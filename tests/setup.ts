import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("Unexpected test network request"))));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
