"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";

import { listingFacts, listingLocation, type PropertyLabels } from "@/components/property/labels";
import { PropertyImage } from "@/components/property/PropertyImage";
import { SegmentedControl } from "@/components/ui/form-controls";
import { interpolate, type Dictionary } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatAmountCompact, formatPrice, formatPriceCompact } from "@/lib/format";
import { districtLabel } from "@/lib/listings/filters";
import type { Listing, ListingType, ListingsSource } from "@/lib/listings/types";
import { ROUTES } from "@/lib/site";

import { projectToPercent } from "./projection";
import { SchematicMap } from "./SchematicMap";

export type MapExplorerLabels = Dictionary["map"] & {
  dealAll: string;
  details: string;
  listTitle?: string;
};

type MapExplorerProps = {
  listings: Listing[];
  source: ListingsSource;
  labels: MapExplorerLabels;
  propertyLabels: PropertyLabels;
  /** `page` adds a selectable list beside the map. */
  variant?: "section" | "page";
};

/** Marker text: the amount alone for UZS (the legend names the currency). */
function markerPrice(listing: Listing): string {
  return listing.price.currency === "UZS" ? formatAmountCompact(listing.price.amount) : formatPriceCompact(listing.price);
}

/**
 * Listings placed on the schematic map, drawn the way the app draws its markers: a paper
 * chip with a hairline, the price inked in the colour of its offer (clay to buy, forest to
 * rent), inverting to espresso when selected. Phones get dots instead of chips — without
 * zoom, price chips would overlap in the city centre.
 */
export function MapExplorer({ listings, source, labels, propertyLabels, variant = "section" }: MapExplorerProps) {
  const id = useId();
  const mapRef = useRef<HTMLDivElement>(null);
  const [deal, setDeal] = useState<ListingType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const placed = useMemo(
    () =>
      listings.flatMap((listing) => {
        const position = listing.location.point ? projectToPercent(listing.location.point) : null;
        return position ? [{ listing, key: `${listing.id}-${listing.listingType}`, position }] : [];
      }),
    [listings],
  );
  const visible = placed.filter(({ listing }) => deal === "all" || listing.listingType === deal);
  const selected = visible.find((item) => item.key === selectedId) ?? null;

  const select = (key: string, scrollIntoView = false) => {
    setSelectedId((current) => (current === key ? null : key));
    if (scrollIntoView) mapRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className={cx(variant === "page" && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start")}>
      <figure className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<ListingType | "all">
            name={`${id}-deal`}
            legend={labels.filterLabel}
            value={deal}
            onChange={(value) => {
              setDeal(value);
              setSelectedId(null);
            }}
            options={[
              { value: "all", label: labels.dealAll },
              { value: "sale", label: labels.legendSale },
              { value: "rent", label: labels.legendRent },
            ]}
          />
          <p aria-live="polite" className="font-mono text-xs text-ink-muted">
            {interpolate(labels.inView, { count: visible.length })}
          </p>
        </div>

        <div
          ref={mapRef}
          role="group"
          aria-label={labels.canvasLabel}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSelectedId(null);
          }}
          className="relative aspect-[5/4] overflow-hidden rounded-xl border border-line-strong bg-map-land"
        >
          <SchematicMap />

          <ul>
            {visible.map(({ listing, key, position }) => {
              const isSelected = key === selectedId;
              const isRent = listing.listingType === "rent";
              return (
                <li
                  key={key}
                  style={{ left: `${position.left}%`, top: `${position.top}%` }}
                  className={cx("absolute -translate-x-1/2 -translate-y-1/2", isSelected ? "z-20" : "z-10")}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={interpolate(labels.pinLabel, {
                      district: districtLabel(listing.location.district) ?? listingLocation(listing, propertyLabels),
                      title: listing.title,
                      price: formatPrice(listing.price),
                    })}
                    onClick={() => select(key)}
                    className={cx(
                      "flex items-center justify-center rounded-full p-1.5 transition-colors sm:rounded-md sm:border sm:px-2 sm:py-1",
                      "sm:font-mono sm:text-[13px] sm:font-semibold sm:leading-none",
                      isSelected
                        ? "sm:border-ink sm:bg-ink sm:text-ink-inverse"
                        : cx(
                            "sm:border-line sm:bg-surface sm:hover:border-line-strong",
                            isRent ? "sm:text-secondary" : "sm:text-primary-strong",
                          ),
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "block rounded-full border-2 border-surface sm:hidden",
                        isSelected ? "size-4 bg-ink" : cx("size-3.5", isRent ? "bg-secondary" : "bg-primary"),
                      )}
                    />
                    <span aria-hidden="true" className="hidden whitespace-nowrap sm:inline">
                      {markerPrice(listing)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <MapPreviewCard
              listing={selected.listing}
              labels={labels}
              propertyLabels={propertyLabels}
              onClose={() => setSelectedId(null)}
            />
          ) : null}
        </div>

        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-muted">
          <span className="font-mono">{source === "demo" ? labels.demoNote : labels.schematicNote}</span>
          <span className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
              {labels.legendSale}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-secondary" />
              {labels.legendRent}
            </span>
          </span>
        </figcaption>
      </figure>

      {variant === "page" ? (
        <section aria-labelledby={`${id}-list`} className="min-w-0">
          <h2 id={`${id}-list`} className="font-display text-xl font-medium text-ink">
            {labels.listTitle}
          </h2>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {visible.map(({ listing, key }) => (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={key === selectedId}
                  onClick={() => select(key, true)}
                  className={cx(
                    "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-muted",
                    key === selectedId && "bg-primary-muted hover:bg-primary-muted",
                  )}
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                    <PropertyImage
                      image={listing.images[0]}
                      alt=""
                      sizes="64px"
                      missingLabel=""
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-semibold text-ink">
                      {formatPrice(listing.price)}
                      {listing.listingType === "rent" ? (
                        <span className="font-sans font-normal text-ink-muted"> {propertyLabels.perMonth}</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink">{listing.title}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {districtLabel(listing.location.district) ?? listingLocation(listing, propertyLabels)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MapPreviewCard({
  listing,
  labels,
  propertyLabels,
  onClose,
}: {
  listing: Listing;
  labels: MapExplorerLabels;
  propertyLabels: PropertyLabels;
  onClose: () => void;
}) {
  const facts = listingFacts(listing, propertyLabels);
  return (
    <div className="absolute inset-x-3 bottom-3 z-30 flex overflow-hidden rounded-lg border border-line bg-surface shadow-floating sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[360px]">
      <div className="relative w-24 shrink-0 bg-surface-muted sm:w-32">
        <PropertyImage
          image={listing.images[0]}
          alt={listing.images[0]?.alt ?? listing.title}
          sizes="128px"
          missingLabel={propertyLabels.imageMissing}
        />
      </div>
      <div className="min-w-0 flex-1 py-3 pl-3.5 pr-10">
        <p className="font-mono text-sm font-semibold text-ink sm:text-[15px]">
          {formatPrice(listing.price)}
          {listing.listingType === "rent" ? (
            <span className="font-sans text-xs font-normal text-ink-muted"> {propertyLabels.perMonth}</span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate font-display text-[15px] font-medium text-ink">{listing.title}</p>
        {facts.length > 0 ? <p className="mt-1 truncate font-mono text-xs text-ink-muted">{facts.join(" · ")}</p> : null}
        <Link
          href={ROUTES.property(listing.id)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-strong hover:text-primary-deep"
        >
          {labels.details}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={labels.closePreview}
        className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
