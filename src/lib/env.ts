import "server-only";

/**
 * Server-side configuration, read from the environment.
 *
 * Nothing here is prefixed `NEXT_PUBLIC_`: every value is consumed by Server Components or
 * Route Handlers, so none of it is inlined into client JavaScript. Pages are statically
 * generated, so changing a value takes effect on the next build or revalidation.
 *
 * Optional values are validated and dropped when malformed — a typo in a store URL should
 * hide a button, not render a broken link.
 */

function read(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function httpUrl(name: string): string | null {
  const value = read(name);
  if (!value) return null;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

function email(name: string): string | null {
  const value = read(name);
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

function phone(name: string): string | null {
  const value = read(name);
  return value && /^\+?[\d\s()-]{7,20}$/.test(value) ? value : null;
}

function siteUrl(): URL {
  const explicit = httpUrl("SITE_URL");
  if (explicit) return new URL(explicit);
  // Vercel exposes the production hostname without a scheme.
  const vercel = read("VERCEL_PROJECT_PRODUCTION_URL");
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${read("PORT") ?? "3000"}`);
}

export const env = {
  /** Canonical origin used for metadata, Open Graph URLs, robots and the sitemap. */
  siteUrl: siteUrl(),

  /**
   * Base URL of the Rezido REST API including `/api/v1`, e.g. `https://api.rezido.uz/api/v1`.
   * Unset means the site shows its clearly labelled demo listings instead.
   */
  apiUrl: httpUrl("REZIDO_API_URL")?.replace(/\/+$/, "") ?? null,

  appStoreUrl: httpUrl("APP_STORE_URL"),
  googlePlayUrl: httpUrl("GOOGLE_PLAY_URL"),

  contactEmail: email("CONTACT_EMAIL"),
  contactPhone: phone("CONTACT_PHONE"),

  social: {
    telegram: httpUrl("TELEGRAM_URL"),
    instagram: httpUrl("INSTAGRAM_URL"),
  },
} as const;
