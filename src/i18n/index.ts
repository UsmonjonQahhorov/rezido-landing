import { DEFAULT_LOCALE, type Locale } from "./config";
import { uz, type Dictionary } from "./dictionaries/uz";

export type { Dictionary } from "./dictionaries/uz";

/**
 * Only Uzbek exists today. When `ru` and `en` dictionaries land they are added here and
 * to `AVAILABLE_LOCALES`; the type ensures each one covers every key `uz` defines.
 */
const DICTIONARIES: Partial<Record<Locale, Dictionary>> = { uz };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[locale] ?? uz;
}

/** Fills `{name}` placeholders. Unknown placeholders are left visible rather than blanked. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
