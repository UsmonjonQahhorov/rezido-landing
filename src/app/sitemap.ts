import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { ROUTES } from "@/lib/site";

/**
 * Indexable pages only. Placeholder pages (privacy, terms, contact without details) and
 * sample listings are `noindex` and deliberately absent. Live listing URLs can be added
 * here once the API is connected and a listing index endpoint is chosen for it.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, env.siteUrl).toString();
  return [
    { url: url(ROUTES.home), changeFrequency: "daily", priority: 1 },
    { url: url(ROUTES.map), changeFrequency: "daily", priority: 0.8 },
    { url: url(ROUTES.listProperty), changeFrequency: "monthly", priority: 0.5 },
    { url: url(ROUTES.credits), changeFrequency: "yearly", priority: 0.1 },
  ];
}
