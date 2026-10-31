import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";

import { interpolate } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatPrice } from "@/lib/format";
import type { Listing } from "@/lib/listings/types";
import { ROUTES } from "@/lib/site";

import { listingFacts, listingLocation, type PropertyLabels } from "./labels";
import { PropertyImage } from "./PropertyImage";

type PropertyCardProps = {
  listing: Listing;
  labels: PropertyLabels;
  sizes?: string;
  /** Heading level inside the surrounding section. */
  headingLevel?: "h3" | "h4";
  className?: string;
};

/**
 * The listing card, after rezido-mobile's `PropertyCard`: photography first, then the price
 * as measured data, then the words. Facts are set in mono so they read as figures.
 *
 * The whole card is one link (the title's, stretched), so keyboard and screen-reader users
 * meet a single, well-named target instead of a nest of them.
 */
export function PropertyCard({
  listing,
  labels,
  sizes = "(min-width: 1280px) 296px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw",
  headingLevel: Heading = "h3",
  className,
}: PropertyCardProps) {
  const primary = listing.images[0];
  const facts = listingFacts(listing, labels);

  return (
    <article
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition duration-200 ease-soft",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary-strong",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        <PropertyImage
          image={primary}
          alt={primary?.alt ?? listing.title}
          sizes={sizes}
          missingLabel={labels.imageMissing}
          className="transition-transform duration-500 ease-soft group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cx(
                "eyebrow rounded-sm px-2 py-1 text-[10px] text-white",
                listing.listingType === "rent" ? "bg-secondary" : "bg-ink/70",
              )}
            >
              {listing.listingType === "rent" ? labels.forRent : labels.forSale}
            </span>
            {listing.isVerified ? (
              <span className="eyebrow inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-1 text-[10px] text-white">
                <BadgeCheck aria-hidden="true" className="size-3" />
                {labels.verified}
              </span>
            ) : null}
          </div>
          {listing.isDemo ? (
            <span className="eyebrow rounded-sm border border-line bg-surface/90 px-1.5 py-0.5 text-[10px] text-ink-muted">
              {labels.demoBadge}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-mono text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {formatPrice(listing.price)}
          {listing.listingType === "rent" ? (
            <span className="ml-1 font-sans text-sm font-normal text-ink-muted">{labels.perMonth}</span>
          ) : null}
        </p>
        <Heading className="mt-1.5 font-display text-[17px] font-medium leading-snug text-ink">
          <Link
            href={ROUTES.property(listing.id)}
            aria-label={interpolate(labels.open, { title: listing.title })}
            className="line-clamp-2 after:absolute after:inset-0 focus-visible:outline-none"
          >
            {listing.title}
          </Link>
        </Heading>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{listingLocation(listing, labels)}</span>
        </p>
        {facts.length > 0 ? (
          <>
            {/* Pins the facts to the bottom so a row of cards lines up, with a minimum gap. */}
            <div aria-hidden="true" className="min-h-4 flex-1" />
            <p className="border-t border-line pt-3 font-mono text-[13px] text-ink-muted">{facts.join(" · ")}</p>
          </>
        ) : null}
      </div>
    </article>
  );
}
