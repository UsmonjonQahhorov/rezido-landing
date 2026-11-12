import type { Currency, Money } from "@/lib/listings/types";

/**
 * Price and measurement formatting — ported from rezido-mobile `src/utils/money.ts` so the
 * site and the app print the same number the same way.
 *
 * Price is the most scanned element on every surface, so it is formatted for scanning, not
 * accounting: `1 050 000 000 so‘m`, never `1050000000.00 UZS`. Significant fractional
 * units are retained (up to the backend's two decimal places). A space groups thousands.
 */

const PREFIX_SYMBOL: Partial<Record<Currency, string>> = { USD: "$", EUR: "€" };
const SUFFIX_LABEL: Partial<Record<Currency, string>> = { UZS: "so‘m", RUB: "₽" };

/** A non-breaking space keeps a price on one line inside narrow cards. */
const NBSP = " ";

function groupDigits(value: number): string {
  return Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

function withCurrency(formatted: string, currency: Currency): string {
  const prefix = PREFIX_SYMBOL[currency];
  if (prefix) return `${prefix}${formatted}`;
  return `${formatted}${NBSP}${SUFFIX_LABEL[currency] ?? currency}`;
}

export function formatPrice({ amount, currency }: Money): string {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  const [whole = "0", fraction = ""] = amount.toFixed(2).split(".");
  const decimals = fraction.replace(/0+$/, "");
  return withCurrency(`${groupDigits(Number(whole))}${decimals ? `,${decimals}` : ""}`, currency);
}

/** Up to `digits` decimals, only when they carry information; decimal comma. */
function trimDecimals(value: number, digits: number): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  return rounded.toString().replace(".", ",");
}

/**
 * Compact amount without the currency, as prices are spoken locally:
 * `1,05 mlrd`, `690 mln`, `5,5 mln`, `850 ming`. Used on map markers and budget options,
 * where a legend or label already names the currency.
 */
export function formatAmountCompact(amount: number): string {
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000_000) return `${trimDecimals(absolute / 1_000_000_000, 2)}${NBSP}mlrd`;
  if (absolute >= 1_000_000) return `${trimDecimals(absolute / 1_000_000, 1)}${NBSP}mln`;
  if (absolute >= 1_000) return `${Math.round(absolute / 1_000)}${NBSP}ming`;
  return groupDigits(absolute);
}

/** Compact price with its currency: `$85k` style for USD/EUR, `1,05 mlrd so‘m` otherwise. */
export function formatPriceCompact({ amount, currency }: Money): string {
  if (!Number.isFinite(amount)) return "—";
  if (PREFIX_SYMBOL[currency]) {
    const absolute = Math.abs(amount);
    if (absolute >= 1_000_000) return withCurrency(`${trimDecimals(absolute / 1_000_000, 1)}M`, currency);
    if (absolute >= 10_000) return withCurrency(`${Math.round(absolute / 1_000)}k`, currency);
    if (absolute >= 1_000) return withCurrency(`${trimDecimals(absolute / 1_000, 1)}k`, currency);
    return withCurrency(String(Math.round(absolute)), currency);
  }
  return withCurrency(formatAmountCompact(amount), currency);
}

export function formatArea(squareMetres: number | null | undefined): string | null {
  if (squareMetres == null || !Number.isFinite(squareMetres)) return null;
  return trimDecimals(squareMetres, 1);
}
