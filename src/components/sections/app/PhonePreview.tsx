import { Heart, House, Map as MapIcon, MapPin, Search, User } from "lucide-react";
import Image from "next/image";

import { Wordmark } from "@/components/layout/Wordmark";
import { listingLocation, rentPeriodLabel, type PropertyLabels } from "@/components/property/labels";
import type { Dictionary } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatPrice } from "@/lib/format";
import type { Listing } from "@/lib/listings/types";

const TAB_ICONS = [House, Search, MapIcon, Heart, User];

/**
 * The app's home screen, rebuilt in HTML from rezido-mobile `app/(tabs)/index.tsx` and
 * `features/marketplace/PropertyCard.tsx`: wordmark, subtitle, search bar, buy/rent chips,
 * "Yangi e’lonlar" and a listing card, over the five-tab bar. There are no app screenshots
 * in the repository yet; this is an illustration of the real layout, not a screenshot.
 */
export function PhonePreview({
  labels,
  propertyLabels,
  listing,
}: {
  labels: Dictionary["app"];
  propertyLabels: PropertyLabels;
  /** The listing shown in the card — a sample one; the whole preview is an illustration. */
  listing: Listing;
}) {
  const image = listing.images[0];
  return (
    <div
      role="img"
      aria-label={labels.previewLabel}
      className="relative mx-auto w-[272px] rounded-[2.6rem] border-[9px] border-ink bg-ink shadow-floating"
    >
      <div className="flex h-[560px] flex-col overflow-hidden rounded-[2rem] bg-background">
        <div className="flex items-center justify-between px-6 pt-3 font-mono text-[11px] font-semibold text-ink">
          <span>9:41</span>
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2 w-3 rounded-[2px] bg-ink" />
            <span className="h-2.5 w-5 rounded-[3px] border border-ink p-px">
              <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
            </span>
          </span>
        </div>

        <div className="flex-1 overflow-hidden px-4 pt-5">
          <Wordmark />
          <p className="mt-1.5 text-[11px] text-ink-muted">{labels.previewSubtitle}</p>

          <div className="mt-4 flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[11px] text-ink-faint">
            <Search className="size-3.5 shrink-0 text-ink-muted" />
            <span className="truncate">{labels.previewSearch}</span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {[propertyLabels.forSale, propertyLabels.forRent].map((chip) => (
              <span key={chip} className="rounded-full bg-primary-muted px-3 py-1.5 text-[10px] font-medium text-ink">
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-baseline justify-between">
            <span className="font-display text-base font-bold text-ink">{labels.previewRecent}</span>
            <span className="text-[11px] font-medium text-primary-strong">{labels.previewSeeAll}</span>
          </div>

          <div className="mt-2.5 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
            <div className="relative aspect-[4/3] bg-surface-muted">
              {image ? (
                <Image
                  src={image.src}
                  alt=""
                  fill
                  unoptimized={image.remote}
                  placeholder={image.blurDataURL ? "blur" : "empty"}
                  blurDataURL={image.blurDataURL}
                  sizes="240px"
                  className="object-cover"
                />
              ) : null}
              <span
                className={cx(
                  "eyebrow absolute left-2 top-2 rounded-sm px-1.5 py-0.5 text-[8px] text-white",
                  listing.listingType === "rent" ? "bg-secondary" : "bg-ink/70",
                )}
              >
                {listing.listingType === "rent" ? propertyLabels.forRent : propertyLabels.forSale}
              </span>
              <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-surface">
                <Heart className="size-3 text-ink" />
              </span>
            </div>
            <div className="space-y-0.5 p-2.5">
              <p className="font-mono text-[12px] font-semibold text-ink">
                {formatPrice(listing.price)}
                  {rentPeriodLabel(listing, propertyLabels) ? (
                    <span className="font-sans text-[9px] font-normal text-ink-muted"> {rentPeriodLabel(listing, propertyLabels)}</span>
                ) : null}
              </p>
              <p className="truncate font-display text-[11px] font-medium text-ink">{listing.title}</p>
              <p className="flex items-center gap-1 truncate text-[9px] text-ink-muted">
                <MapPin className="size-2.5 shrink-0" /> {listingLocation(listing, propertyLabels)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 border-t border-line bg-surface px-1 pb-4 pt-2">
          {labels.previewTabs.map((tab, index) => {
            const Icon = TAB_ICONS[index] ?? House;
            return (
              <span
                key={tab}
                className={cx(
                  "flex flex-col items-center gap-0.5 text-[8px] font-semibold",
                  index === 0 ? "text-primary-strong" : "text-ink-muted",
                )}
              >
                <Icon className="size-4" />
                {tab}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
