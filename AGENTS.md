# Rezido Landing — working agreements

Read `README.md` first. The mobile app (`../rezido-mobile`) is the source of truth for the
brand; `src/app/globals.css` mirrors its `constants/theme.ts`.

- **No hardcoded user-facing strings.** Copy lives in `src/i18n/dictionaries/uz.ts`.
- **No colour outside the theme.** Use the semantic Tailwind tokens; the default palette is cleared.
- **Listing data goes through `src/lib/listings`.** The browser calls `/api/listings` only.
- **Never present demo data as real**, never invent claims, contacts, store links or legal text.
  Optional links render only when their environment variable is set.
- Before finishing: `npm run check` (typecheck + lint + build) must pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
