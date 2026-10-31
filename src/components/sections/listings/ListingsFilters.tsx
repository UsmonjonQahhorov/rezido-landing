"use client";

import { MapPin, RotateCcw } from "lucide-react";
import { useId } from "react";

import { buttonClasses } from "@/components/ui/button";
import {
  FIELD_LABEL_CLASSES,
  Field,
  SegmentedControl,
  SelectInput,
  TextInput,
} from "@/components/ui/form-controls";
import { interpolate, type Dictionary } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatAmountCompact } from "@/lib/format";
import {
  FILTER_PROPERTY_TYPES,
  LOCATION_MAX_LENGTH,
  PRICE_RANGES,
  ROOM_OPTIONS,
  parsePriceRangeKey,
  priceRangeKey,
  type ListingFilters,
  type PriceRange,
  type SortOption,
} from "@/lib/listings/filters";
import type { ListingType, PropertyType } from "@/lib/listings/types";

import { DistrictSuggestions } from "./DistrictSuggestions";

export type ListingsFiltersLabels = Dictionary["listings"] & { som: string };

type ListingsFiltersProps = {
  filters: ListingFilters;
  /** The location as typed, ahead of the debounced value in `filters`. */
  locationDraft: string;
  onLocationChange?: (value: string) => void;
  onChange?: (patch: Partial<ListingFilters>) => void;
  onReset?: () => void;
  canReset: boolean;
  labels: ListingsFiltersLabels;
  propertyTypeLabels: Record<PropertyType, string>;
  /** Rendered before hydration: same layout, no interaction. */
  disabled?: boolean;
};

function priceRangeLabel(range: PriceRange, labels: ListingsFiltersLabels): string {
  const amount = (value: number) => `${formatAmountCompact(value)} ${labels.som}`;
  if (range.min === null && range.max !== null) return interpolate(labels.priceUpTo, { amount: amount(range.max) });
  if (range.max === null && range.min !== null) return interpolate(labels.priceFrom, { amount: amount(range.min) });
  if (range.min !== null && range.max !== null) {
    return interpolate(labels.priceBetween, { min: formatAmountCompact(range.min), max: amount(range.max) });
  }
  return labels.anyPrice;
}

export function ListingsFilters({
  filters,
  locationDraft,
  onLocationChange,
  onChange,
  onReset,
  canReset,
  labels,
  propertyTypeLabels,
  disabled = false,
}: ListingsFiltersProps) {
  const id = useId();
  const deal = filters.listingType ?? "all";

  const ranges = filters.listingType ? PRICE_RANGES[filters.listingType] : [];
  const hasPrice = filters.priceMin !== null || filters.priceMax !== null;
  const currentRange: PriceRange = { min: filters.priceMin, max: filters.priceMax };
  const currentKey = hasPrice ? priceRangeKey(currentRange) : "";
  // A budget from the hero ("1 mlrd gacha") need not be one of the explorer's ranges.
  const priceOptions =
    hasPrice && !ranges.some((range) => priceRangeKey(range) === currentKey) ? [...ranges, currentRange] : ranges;

  return (
    <form
      role="search"
      aria-label={labels.filtersLabel}
      onSubmit={(event) => event.preventDefault()}
      className="rounded-xl border border-line bg-surface p-4 sm:p-5"
    >
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="sr-only">{labels.filtersLabel}</legend>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SegmentedControl<ListingType | "all">
            name={`${id}-deal`}
            legend={labels.dealLabel}
            value={deal}
            onChange={(value) =>
              onChange?.({
                listingType: value === "all" ? null : value,
                // Sale and rent prices are on different scales.
                priceMin: null,
                priceMax: null,
              })
            }
            options={[
              { value: "all", label: labels.dealAll },
              { value: "sale", label: labels.dealSale },
              { value: "rent", label: labels.dealRent },
            ]}
          />

          <div className="flex items-center justify-between gap-3 md:justify-end">
            {canReset ? (
              <button
                type="button"
                onClick={onReset}
                className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-2 md:ml-0" })}
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                {labels.reset}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2.5">
              <label htmlFor={`${id}-sort`} className={cx(FIELD_LABEL_CLASSES, "shrink-0")}>
                {labels.sort}
              </label>
              <SelectInput
                id={`${id}-sort`}
                value={filters.sort}
                onChange={(event) => onChange?.({ sort: event.target.value as SortOption })}
                className="h-9 w-auto text-sm"
              >
                <option value="newest">{labels.sortNewest}</option>
                <option value="price_asc">{labels.sortPriceAsc}</option>
                <option value="price_desc">{labels.sortPriceDesc}</option>
              </SelectInput>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_minmax(0,1.1fr)]">
          <Field label={labels.location} htmlFor={`${id}-location`}>
            <TextInput
              id={`${id}-location`}
              type="text"
              autoComplete="off"
              list={`${id}-districts`}
              maxLength={LOCATION_MAX_LENGTH}
              placeholder={labels.locationPlaceholder}
              value={locationDraft}
              onChange={(event) => onLocationChange?.(event.target.value)}
              icon={<MapPin className="size-4" />}
            />
            <DistrictSuggestions id={`${id}-districts`} />
          </Field>

          <Field label={labels.propertyType} htmlFor={`${id}-type`}>
            <SelectInput
              id={`${id}-type`}
              value={filters.propertyType ?? ""}
              onChange={(event) => onChange?.({ propertyType: (event.target.value || null) as PropertyType | null })}
            >
              <option value="">{labels.allTypes}</option>
              {FILTER_PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {propertyTypeLabels[type]}
                </option>
              ))}
              {filters.propertyType && !(FILTER_PROPERTY_TYPES as readonly string[]).includes(filters.propertyType) ? (
                <option value={filters.propertyType}>{propertyTypeLabels[filters.propertyType]}</option>
              ) : null}
            </SelectInput>
          </Field>

          <fieldset className="min-w-0 sm:col-span-2 lg:col-span-1">
            <legend className={cx(FIELD_LABEL_CLASSES, "mb-2 block")}>{labels.rooms}</legend>
            <div className="flex gap-1.5">
              {ROOM_OPTIONS.map((rooms) => {
                const checked = filters.rooms.includes(rooms);
                return (
                  <label
                    key={rooms}
                    className={cx(
                      "flex h-11 min-w-11 flex-1 cursor-pointer items-center justify-center rounded-md border px-3 font-mono text-sm transition-colors lg:flex-none",
                      "border-line-strong bg-surface text-ink hover:border-ink-faint",
                      "has-checked:border-primary-strong has-checked:bg-primary-muted has-checked:font-semibold",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary-strong",
                      "has-disabled:cursor-not-allowed has-disabled:opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() =>
                        onChange?.({
                          rooms: checked
                            ? filters.rooms.filter((value) => value !== rooms)
                            : [...filters.rooms, rooms].sort((a, b) => a - b),
                        })
                      }
                    />
                    <span aria-hidden="true">{rooms === 4 ? "4+" : rooms}</span>
                    <span className="sr-only">
                      {rooms === 4 ? labels.roomsOptionMax : interpolate(labels.roomsOption, { count: rooms })}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field label={labels.price} htmlFor={`${id}-price`}>
            <SelectInput
              id={`${id}-price`}
              disabled={!filters.listingType}
              value={currentKey}
              onChange={(event) => {
                const { min, max } = event.target.value ? parsePriceRangeKey(event.target.value) : { min: null, max: null };
                onChange?.({ priceMin: min, priceMax: max });
              }}
            >
              {filters.listingType ? (
                <>
                  <option value="">{labels.anyPrice}</option>
                  {priceOptions.map((range) => (
                    <option key={priceRangeKey(range)} value={priceRangeKey(range)}>
                      {priceRangeLabel(range, labels)}
                    </option>
                  ))}
                </>
              ) : (
                <option value="">{labels.priceNeedsDeal}</option>
              )}
            </SelectInput>
          </Field>
        </div>
      </fieldset>
    </form>
  );
}
