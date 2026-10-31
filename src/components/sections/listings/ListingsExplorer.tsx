"use client";

import { CircleAlert, Info, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ListingsGrid, ListingsGridSkeleton } from "@/components/property/ListingsGrid";
import type { PropertyLabels } from "@/components/property/labels";
import { buttonClasses } from "@/components/ui/button";
import { interpolate } from "@/i18n";
import { cx } from "@/lib/cx";
import { requestListings } from "@/lib/listings/client";
import { DEFAULT_FILTERS, parseFilters, serializeFilters, type ListingFilters } from "@/lib/listings/filters";
import type { ListingsResult, PropertyType } from "@/lib/listings/types";

import { ListingsFilters, type ListingsFiltersLabels } from "./ListingsFilters";

/** Search-as-you-type debounce, as in the mobile app. */
const LOCATION_DEBOUNCE_MS = 350;

type ExplorerLabels = ListingsFiltersLabels & { retry: string; loading: string };

type ListingsExplorerProps = {
  /** Server-rendered results for the default (unfiltered) view, or null if that failed. */
  initial: ListingsResult | null;
  labels: ExplorerLabels;
  propertyLabels: PropertyLabels;
  propertyTypeLabels: Record<PropertyType, string>;
};

/** The last settled request, tagged with the query (and retry attempt) it answered. */
type FetchState =
  | { key: string; status: "success"; data: ListingsResult }
  | { key: string; status: "error" };

function writeQuery(query: string) {
  const { pathname, hash } = window.location;
  window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${hash}`);
}

/**
 * Filters, results and their states. The URL is the source of truth: the hero form and
 * the header's buy/rent links write it, this component reads it, so every view can be
 * shared. Each request is cancelled when a newer one supersedes it.
 */
export function ListingsExplorer({ initial, labels, propertyLabels, propertyTypeLabels }: ListingsExplorerProps) {
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = serializeFilters(filters);

  const [attempt, setAttempt] = useState(0);
  const requestKey = `${query}|${attempt}`;
  const [response, setResponse] = useState<FetchState | null>(
    initial ? { key: `${serializeFilters(DEFAULT_FILTERS)}|0`, status: "success", data: initial } : null,
  );

  // The location field updates on every keystroke; the URL (and the request) follow it
  // after a pause. When the URL changes from elsewhere, the field follows the URL.
  const [locationDraft, setLocationDraft] = useState(filters.location);
  const [syncedLocation, setSyncedLocation] = useState(filters.location);
  if (filters.location !== syncedLocation) {
    setSyncedLocation(filters.location);
    if (filters.location !== locationDraft.trim()) setLocationDraft(filters.location);
  }

  const updateFilters = useCallback(
    (patch: Partial<ListingFilters>) => writeQuery(serializeFilters({ ...filters, ...patch })),
    [filters],
  );

  useEffect(() => {
    const next = locationDraft.trim();
    if (next === filters.location) return;
    const timer = window.setTimeout(() => updateFilters({ location: next }), LOCATION_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [locationDraft, filters.location, updateFilters]);

  const responseKey = response?.key;
  useEffect(() => {
    if (responseKey === requestKey) return;
    const controller = new AbortController();
    requestListings(query, controller.signal)
      .then((data) => setResponse({ key: requestKey, status: "success", data }))
      .catch(() => {
        if (!controller.signal.aborted) setResponse({ key: requestKey, status: "error" });
      });
    return () => controller.abort();
  }, [query, requestKey, responseKey]);

  const isLoading = responseKey !== requestKey;
  const data = response?.status === "success" ? response.data : null;
  const showError = response?.status === "error" && !isLoading;
  const canReset = query !== "" || locationDraft.trim() !== "";

  const reset = () => {
    setLocationDraft("");
    writeQuery("");
  };

  return (
    <div>
      <ListingsFilters
        filters={filters}
        locationDraft={locationDraft}
        onLocationChange={setLocationDraft}
        onChange={updateFilters}
        onReset={reset}
        canReset={canReset}
        labels={labels}
        propertyTypeLabels={propertyTypeLabels}
      />

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <p aria-live="polite" className="font-mono text-sm text-ink">
          {isLoading ? labels.loading : data && !showError ? interpolate(labels.resultsCount, { count: data.count }) : ""}
        </p>
        {data?.source === "demo" ? (
          <p className="flex max-w-xl items-start gap-2 text-sm text-ink-muted">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-strong" />
            {labels.demoNotice}
          </p>
        ) : null}
      </div>

      <div className="mt-5" aria-busy={isLoading}>
        {showError ? (
          <StateMessage
            tone="error"
            title={labels.errorTitle}
            body={labels.errorBody}
            action={{ label: labels.retry, onClick: () => setAttempt((value) => value + 1) }}
          />
        ) : data ? (
          data.results.length > 0 ? (
            <ListingsGrid
              listings={data.results}
              labels={propertyLabels}
              className={cx("transition-opacity duration-200", isLoading && "opacity-50")}
            />
          ) : isLoading ? (
            <ListingsGridSkeleton />
          ) : (
            <StateMessage
              tone="empty"
              title={labels.emptyTitle}
              body={labels.emptyBody}
              action={{ label: labels.reset, onClick: reset }}
            />
          )
        ) : (
          <ListingsGridSkeleton />
        )}
      </div>
    </div>
  );
}

function StateMessage({
  tone,
  title,
  body,
  action,
}: {
  tone: "empty" | "error";
  title: string;
  body: string;
  action: { label: string; onClick: () => void };
}) {
  const Icon = tone === "error" ? CircleAlert : SearchX;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-lg border border-line bg-background">
        <Icon aria-hidden="true" className={cx("size-6", tone === "error" ? "text-danger" : "text-primary-strong")} />
      </span>
      <h3 className="mt-4 font-display text-xl font-medium text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-[15px] text-ink-muted">{body}</p>
      <button type="button" onClick={action.onClick} className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        {action.label}
      </button>
    </div>
  );
}
