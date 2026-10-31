"use client";

import { MapPin, Search } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { DistrictSuggestions } from "@/components/sections/listings/DistrictSuggestions";
import { buttonClasses } from "@/components/ui/button";
import { Field, SegmentedControl, SelectInput, TextInput } from "@/components/ui/form-controls";
import { interpolate } from "@/i18n";
import { cx } from "@/lib/cx";
import { formatAmountCompact } from "@/lib/format";
import {
  BUDGETS,
  DEFAULT_FILTERS,
  FILTER_PROPERTY_TYPES,
  LOCATION_MAX_LENGTH,
  serializeFilters,
} from "@/lib/listings/filters";
import type { ListingType, PropertyType } from "@/lib/listings/types";
import { SECTION_IDS } from "@/lib/site";

export type HeroSearchLabels = {
  searchLabel: string;
  dealLabel: string;
  buy: string;
  rent: string;
  location: string;
  locationPlaceholder: string;
  propertyType: string;
  allTypes: string;
  budget: string;
  anyBudget: string;
  priceUpTo: string;
  som: string;
  submit: string;
};

type HeroSearchFormProps = {
  labels: HeroSearchLabels;
  propertyTypeLabels: Record<PropertyType, string>;
  className?: string;
};

/**
 * The hero's quick search. It writes the same URL the listings explorer reads, then moves
 * the reader (scroll and focus) to the results. Without JavaScript it is an ordinary GET
 * form to the same URL.
 */
export function HeroSearchForm({ labels, propertyTypeLabels, className }: HeroSearchFormProps) {
  const id = useId();
  const [listingType, setListingType] = useState<ListingType>("sale");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [budget, setBudget] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = serializeFilters({
      ...DEFAULT_FILTERS,
      listingType,
      location: location.trim(),
      propertyType: propertyType || null,
      priceMax: budget ? Number(budget) : null,
    });
    const sectionId = SECTION_IDS.listings;
    window.history.pushState(null, "", `/?${query}#${sectionId}`);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    document.getElementById(`${sectionId}-title`)?.focus({ preventScroll: true });
  };

  return (
    <form
      role="search"
      aria-label={labels.searchLabel}
      action={`/#${SECTION_IDS.listings}`}
      method="get"
      onSubmit={onSubmit}
      className={cx("rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5", className)}
    >
      <SegmentedControl
        name="listing_type"
        legend={labels.dealLabel}
        size="lg"
        value={listingType}
        onChange={(value) => {
          setListingType(value);
          // Sale and rent budgets are on different scales; keeping one would mislead.
          setBudget("");
        }}
        options={[
          { value: "sale", label: labels.buy },
          { value: "rent", label: labels.rent },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Field label={labels.location} htmlFor={`${id}-location`} className="sm:col-span-2 lg:col-span-3">
          <TextInput
            id={`${id}-location`}
            name="location"
            type="text"
            autoComplete="off"
            list={`${id}-districts`}
            maxLength={LOCATION_MAX_LENGTH}
            placeholder={labels.locationPlaceholder}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            icon={<MapPin className="size-4" />}
          />
          <DistrictSuggestions id={`${id}-districts`} />
        </Field>

        <Field label={labels.propertyType} htmlFor={`${id}-type`}>
          <SelectInput
            id={`${id}-type`}
            name="property_type"
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value as PropertyType | "")}
          >
            <option value="">{labels.allTypes}</option>
            {FILTER_PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {propertyTypeLabels[type]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label={labels.budget} htmlFor={`${id}-budget`}>
          <SelectInput
            id={`${id}-budget`}
            name="price_max"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          >
            <option value="">{labels.anyBudget}</option>
            {BUDGETS[listingType].map((amount) => (
              <option key={amount} value={amount}>
                {interpolate(labels.priceUpTo, { amount: `${formatAmountCompact(amount)} ${labels.som}` })}
              </option>
            ))}
          </SelectInput>
        </Field>

        <button
          type="submit"
          className={buttonClasses({
            variant: "primary",
            size: "md",
            className: "self-end sm:col-span-2 lg:col-span-1 lg:px-6",
          })}
        >
          <Search aria-hidden="true" className="size-4" />
          {labels.submit}
        </button>
      </div>
    </form>
  );
}
