/**
 * Locales the product targets. Uzbek ships first; Russian and English are planned and are
 * listed so the language switcher, `<html lang>` and future routing share one definition.
 */
export const LOCALES = ["uz", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

/** Locales whose dictionary exists. Adding `ru` here is what turns its switcher entry on. */
export const AVAILABLE_LOCALES: readonly Locale[] = ["uz"];

/** Each language named in itself, as a switcher should show it. */
export const LOCALE_NAMES: Record<Locale, string> = {
  uz: "O‘zbekcha",
  ru: "Русский",
  en: "English",
};

/** Open Graph locale codes. */
export const OG_LOCALES: Record<Locale, string> = {
  uz: "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};
