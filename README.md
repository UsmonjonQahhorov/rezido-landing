# Rezido Landing

Marketing site and public listings preview for **Rezido**, the real-estate platform for
Uzbekistan. Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
Lucide icons. Uzbek first; structured for Russian and English.

It is independent of `rezido-mobile` and `rezido-backend`: it copies nothing at runtime
and talks to the backend only over its public HTTP API, and only when configured to.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — every variable has a safe default
npm run dev                  # http://localhost:3000
```

Requires Node.js 20.9 or newer.

## Commands

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Development server (Turbopack)                             |
| `npm run build`     | Production build                                           |
| `npm start`         | Serve the production build (`-p <port>` to change port)    |
| `npm run lint`      | ESLint, warnings treated as errors                         |
| `npm run typecheck` | Generates route types, then `tsc --noEmit`                 |
| `npm run check`     | typecheck + lint + build — run before shipping             |

## Environment variables

All optional, all server-side (nothing is `NEXT_PUBLIC_`). See `.env.example`.

| Variable                          | Effect                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| `SITE_URL`                        | Canonical origin for metadata, OG, robots, sitemap                         |
| `REZIDO_API_URL`                  | Rezido API base incl. `/api/v1`. Unset → demo listings                     |
| `APP_STORE_URL`, `GOOGLE_PLAY_URL`| Store buttons in the app section. Hidden until set                         |
| `CONTACT_EMAIL`, `CONTACT_PHONE`  | Shown on `/contact`. Until set, the page says details are coming           |
| `TELEGRAM_URL`, `INSTAGRAM_URL`   | Footer social links. Hidden until set                                      |

Malformed values (not `http(s)`, not an email) are ignored rather than rendered.
Pages are static, so env changes apply on the next build or revalidation.

## Pages

| Route             | Notes                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| `/`               | Hero search, listings explorer, map, how it works, why Rezido, owners CTA, app, FAQ |
| `/property/[id]`  | Listing detail. Demo listings are prerendered and `noindex`                 |
| `/map`            | Larger schematic map with a selectable list                                |
| `/list-property`  | Placeholder: listing creation is not built yet (in the app either). No form |
| `/contact`        | Env-driven contact details, otherwise a "coming soon" note (`noindex`)      |
| `/privacy`, `/terms` | "Document in preparation" placeholders (`noindex`). No invented terms   |
| `/credits`        | Photo attribution required by the CC licences                              |
| `/api/listings`   | JSON search endpoint used by the explorer                                  |

Plus `icon.svg`, `apple-icon`, `opengraph-image`, `robots.txt`, `sitemap.xml`.

## Project layout

```
src/
├── app/                 Routes, metadata files, the /api/listings route handler
├── components/
│   ├── layout/          Header, footer, mobile nav, language switcher, wordmark
│   ├── sections/        Landing sections (hero, listings, map, FAQ, …)
│   ├── property/        PropertyCard, PropertyImage, grid, shared labels
│   ├── map/             Schematic map, projection, MapExplorer
│   └── ui/              Button classes, form controls, section heading
├── data/                Demo listings and the photo registry (with credits)
├── i18n/                Locale config and dictionaries (uz today)
├── lib/
│   ├── listings/        Types, filters ↔ URL, API client, data source
│   ├── env.ts           Validated server config
│   ├── format.ts        Prices and areas (ported from the app)
│   └── site.ts          Routes, section anchors, nav links
└── assets/              Photographs and the two fonts the OG image needs
```

## Design system

The mobile app is the source of truth. Tokens in `src/app/globals.css` mirror
`rezido-mobile/src/constants/theme.ts`: cream `#FBF4E7` paper, clay `#E1552F` as the one
accent, forest `#3E6B4B` secondary (rent), espresso `#2A2118` text, tight 4/8/12/16 radii,
two soft shadow levels. Tailwind's default palette is cleared so only brand colours exist.

Two accessibility-driven derivations, documented in the CSS:

- Filled buttons and small clay text use `primary-strong` `#C44421` (the app's pressed
  clay), because white on `#E1552F` is 3.8:1 — below WCAG AA for body-size labels.
- Small clay text on espresso uses `primary-on-dark` `#EE7350` (5.4:1).

Typography follows the Rezido Brand Identity: Space Grotesk (headings), Inter (text),
IBM Plex Mono (prices, areas, floors), self-hosted via `next/font`.

The wordmark is the app's: lowercase "rezido" with one tilted clay square. The full
isometric mark has no asset yet; the favicon uses the same tilted square.

## Data: demo vs live

`src/lib/listings/index.ts` is the single boundary.

- **Demo (default).** 8 sample listings in `src/data/demo-listings.ts`, filtered and
  sorted locally. Every one has `isDemo: true`, which renders a "Namuna" (sample) tag on
  cards, a banner on detail pages, a notice above results and a line in the footer. None
  is marked verified. Demo detail pages are `noindex` and left out of the sitemap.
- **Live.** With `REZIDO_API_URL` set, data comes from rezido-backend:
  - `GET /properties/` — `MarketplaceListView` (`AllowAny`), filters per
    `MarketplaceSearchSerializer`: `listing_type`, `property_type`, `rooms` (1–4, 4 = 4+),
    `price_min`/`price_max` + `currency=UZS`, `district` or `query`, `sort`, `page_size`.
  - `GET /properties/{uuid}/` — `MarketplaceDetailView` with ordered `media`.

  Responses are parsed defensively (`src/lib/listings/api.ts`); unknown enum values
  degrade, broken rows are skipped, backend error text is never shown. Requests time out
  after 8 s and are cached for 60 s. If the API is configured but down, the page renders
  and the explorer shows an error with a retry — it never falls back to demo data.

The browser only ever calls `/api/listings`, so the backend URL stays server-side and no
CORS configuration is needed. Filter state lives in the URL (`?listing_type=rent&rooms=2,3`),
so every view is shareable; the hero form and the header's buy/rent links write it.

Remote listing photos are loaded with `unoptimized` (the backend already serves
normalised sizes and the media host is not known at build time). To route them through
the Next optimiser, add the media host to `images.remotePatterns` in `next.config.ts` and
drop `unoptimized` for those images in `PropertyImage`.

Verified against the local backend (`docker compose`, port 8001, seeded data): search,
district matching, price filters and detail pages all work.

## Map

`rezido-mobile` uses Mapbox. No web map key is configured here, so the site draws a
**schematic** of Tashkent (ring roads, main avenues, canals, parks, district labels) and
places listings on it by their real coordinates. It is labelled as schematic everywhere.
Markers follow the app's style: paper chips, price in clay (sale) or forest (rent),
espresso when selected; phones get dots, since without zoom the chips would overlap.

To use a real map later, mount Mapbox GL JS in `MapExplorer` with a **public** `pk.`
token (`NEXT_PUBLIC_MAPBOX_TOKEN`), scoped to the site's domain in the Mapbox dashboard.

## Localisation

All UI copy is in `src/i18n/dictionaries/uz.ts` (plain strings, `{placeholder}`
interpolation, so slices can be passed to Client Components). The language switcher lists
O‘zbekcha, Русский and English; the last two are marked "tez orada" (coming soon).

To add Russian: create `dictionaries/ru.ts` typed as `Dictionary`, register it in
`src/i18n/index.ts` and `AVAILABLE_LOCALES`, move routes under `app/[locale]/` with
`generateStaticParams`, add a `proxy.ts` for locale detection, and add the `cyrillic`
subset to Inter and IBM Plex Mono in `layout.tsx` (Space Grotesk has no Cyrillic; pick a
fallback for headings). Listing titles and descriptions are user content and stay as written.

## Images and licences

All photographs are real and freely licensed (Wikimedia Commons: CC0, CC BY, CC BY-SA).
The interiors are the set rezido-backend seeds its demo data with; the Tashkent exteriors
were added for this site. Provenance lives in `src/data/photos.ts` and is rendered on
`/credits`. Files were resized to ≤1600 px and stripped of metadata. Fonts copied for the
OG image are OFL (`src/assets/fonts/LICENSES.md`).

## Deployment

Any Node.js host that runs `next start`, or Vercel.

```bash
npm ci
npm run build
SITE_URL=https://your-domain npm start -p 3000
```

- Set `SITE_URL` (and `REZIDO_API_URL` when going live) at **build** time.
- With the API connected, add the site origin to the backend's `CORS_ALLOWED_ORIGINS`
  only if you later call the API from the browser; the current design does not.
- `/api/listings` responses are cached for 60 s at shared caches
  (`s-maxage=60, stale-while-revalidate=300`).
- Security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`)
  are set in `next.config.ts`.

## Known limitations

- Listings are demo data until `REZIDO_API_URL` is set.
- The map is schematic, not a tiled map.
- No login, favourites, inquiries or listing creation on the web: contact happens through
  the mobile app, which is not yet published, and listing creation is not built anywhere.
- Russian and English are not translated yet.
- App screenshots don't exist yet; the app section shows an HTML rendering of the app's
  real home-screen layout.
- `npm audit` reports advisories in ESLint's dev-only dependency tree (`braces` via
  `eslint-config-next`); nothing in the production bundle.
