import { ArrowLeft, ArrowRight, Info, MapPin, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ListingsGrid } from "@/components/property/ListingsGrid";
import { listingLocation, listingPriceText, propertyLabels, rentPeriodLabel } from "@/components/property/labels";
import { PropertyImage } from "@/components/property/PropertyImage";
import { getDictionary, interpolate } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatArea, formatPrice } from "@/lib/format";
import { getListing, getSimilarListings, staticListingIds } from "@/lib/listings";
import { districtLabel, normaliseText } from "@/lib/listings/filters";
import { SECTION_IDS } from "@/lib/site";

export const revalidate = 300;
/** Live listings are not known at build time; they render on first request. */
export const dynamicParams = true;

export function generateStaticParams() {
  return staticListingIds().map((id) => ({ id }));
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Shared by metadata and the page, so one request serves both. */
const loadListing = cache(async (id: string) => getListing(safeDecode(id)));

export async function generateMetadata({ params }: PageProps<"/property/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) return { title: getDictionary().propertyPage.notFoundTitle };
  const labels = propertyLabels(getDictionary());
  const description = `${listingPriceText(listing, labels)} · ${listingLocation(listing, labels)}`;
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/property/${encodeURIComponent(listing.id)}` },
    // Sample listings are not offers; keep them out of search results.
    robots: listing.isDemo ? { index: false, follow: true } : undefined,
    openGraph: { title: listing.title, description },
  };
}

export default async function PropertyPage({ params }: PageProps<"/property/[id]">) {
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) notFound();

  const dict = getDictionary();
  const page = dict.propertyPage;
  const labels = propertyLabels(dict);
  const similar = await getSimilarListings(listing).catch(() => []);
  const [primary, ...rest] = listing.images;
  const secondary = rest.slice(0, 2);
  const area = formatArea(listing.areaTotal);

  const facts = [
    { label: page.area, value: area ? interpolate(labels.area, { value: area }) : null, figure: true },
    { label: page.rooms, value: listing.rooms !== null ? String(listing.rooms) : null, figure: true },
    {
      label: page.floor,
      figure: true,
      value:
        listing.floor !== null && listing.floorsTotal !== null
          ? `${listing.floor}/${listing.floorsTotal}`
          : listing.floor !== null
            ? String(listing.floor)
            : listing.floorsTotal !== null
              ? interpolate(labels.floorsTotal, { count: listing.floorsTotal })
              : null,
    },
    { label: page.propertyType, value: dict.propertyTypes[listing.propertyType], figure: false },
    { label: page.renovation, value: listing.renovation ? dict.renovation[listing.renovation] : null, figure: false },
    { label: page.furnishing, value: listing.furnishing ? dict.furnishing[listing.furnishing] : null, figure: false },
  ].filter((fact): fact is { label: string; value: string; figure: boolean } => fact.value !== null);

  // The address usually names the district already ("Mirobod tumani, …"); say it once.
  const district = districtLabel(listing.location.district);
  const address = listing.location.address;
  const locationLine = [
    listing.location.region,
    address && district && normaliseText(address).includes(normaliseText(district)) ? null : district,
    address,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="container-page pb-20 pt-8 sm:pb-28 sm:pt-10">
      <nav aria-label={page.breadcrumb} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className="hover:text-ink">
              {dict.common.home}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/#${SECTION_IDS.listings}`} className="hover:text-ink">
              {page.listings}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-[16rem] truncate text-ink sm:max-w-md">
            {listing.title}
          </li>
        </ol>
      </nav>

      {listing.isDemo ? (
        <p className="mt-6 flex items-start gap-2.5 rounded-lg border border-line-strong bg-surface-muted px-4 py-3 text-sm text-ink">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
          {page.demoBanner}
        </p>
      ) : null}

      <section aria-label={page.gallery} className="mt-6">
        <div className={cx("grid gap-2 sm:gap-3", secondary.length > 0 && "lg:grid-cols-3 lg:grid-rows-2")}>
          <div
            className={cx(
              "relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted",
              secondary.length > 0 && "lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[480px]",
            )}
          >
            <PropertyImage
              image={primary}
              alt={primary?.alt ?? interpolate(page.photoAlt, { title: listing.title, index: 1 })}
              sizes="(min-width: 1024px) 66vw, 100vw"
              missingLabel={labels.imageMissing}
              preload
            />
          </div>
          {secondary.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:col-span-1 lg:row-span-2 lg:grid-cols-1">
              {secondary.map((image, index) => (
                <div key={image.src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted lg:aspect-auto">
                  <PropertyImage
                    image={image}
                    alt={image.alt ?? interpolate(page.photoAlt, { title: listing.title, index: index + 2 })}
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    missingLabel={labels.imageMissing}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                "eyebrow rounded-sm px-2 py-1 text-[11px] text-white",
                listing.listingType === "rent" ? "bg-secondary" : "bg-ink",
              )}
            >
              {listing.listingType === "rent" ? labels.forRent : labels.forSale}
            </span>
            {listing.isDemo ? (
              <span className="eyebrow rounded-sm border border-line-strong px-2 py-1 text-[11px] text-ink-muted">
                {labels.demoBadge}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-ink text-balance sm:text-[2.5rem]">
            {listing.title}
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-ink-muted">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {listingLocation(listing, labels)}
          </p>
          <p className="mt-6 font-mono text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-[2.1rem]">
            {formatPrice(listing.price)}
            {rentPeriodLabel(listing, labels) ? (
              <span className="ml-1.5 font-sans text-base font-normal text-ink-muted">{rentPeriodLabel(listing, labels)}</span>
            ) : null}
          </p>

          <section aria-labelledby="facts-title" className="mt-10">
            <h2 id="facts-title" className="eyebrow text-ink-muted">
              {page.facts}
            </h2>
            <dl className="mt-4 grid grid-cols-2 border-t border-line sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="border-b border-line py-4 pr-4">
                  <dt className="text-sm text-ink-muted">{fact.label}</dt>
                  <dd
                    className={cx(
                      "mt-1 text-ink",
                      fact.figure ? "font-mono text-lg font-semibold" : "font-display text-[17px] font-medium",
                    )}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="description-title" className="mt-10">
            <h2 id="description-title" className="font-display text-2xl font-medium text-ink">
              {page.description}
            </h2>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-[17px] leading-relaxed text-ink-muted">
              {listing.description || page.noDescription}
            </p>
          </section>

          {listing.location.district || listing.location.address ? (
            <section aria-labelledby="location-title" className="mt-10">
              <h2 id="location-title" className="font-display text-2xl font-medium text-ink">
                {page.location}
              </h2>
              <p className="mt-4 text-[17px] text-ink-muted">{locationLine}</p>
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-line bg-surface p-6 lg:sticky lg:top-24">
            <MessageSquareText aria-hidden="true" className="size-6 text-primary-strong" />
            <h2 className="mt-4 font-display text-xl font-medium text-ink">{page.contactTitle}</h2>
            {listing.ownerName ? (
              <p className="mt-3 text-sm text-ink-muted">
                {page.owner}: <span className="font-semibold text-ink">{listing.ownerName}</span>
              </p>
            ) : null}
            <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
              {listing.isDemo ? page.contactDemo : page.contactBody}
            </p>
            <Link
              href={`/#${SECTION_IDS.app}`}
              className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary-strong hover:text-primary-deep"
            >
              {page.aboutApp}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </aside>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-title" className="mt-20 border-t border-line pt-12">
          <h2 id="similar-title" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">
            {page.similar}
          </h2>
          <ListingsGrid listings={similar} labels={labels} maxColumns={3} className="mt-8" />
        </section>
      ) : null}

      <Link
        href={`/#${SECTION_IDS.listings}`}
        className="mt-14 inline-flex items-center gap-2 text-[15px] font-semibold text-ink hover:text-primary-strong"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {page.back}
      </Link>
    </article>
  );
}
