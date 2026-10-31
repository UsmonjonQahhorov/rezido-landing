import type { Dictionary } from "@/i18n";

/** Anchors of the landing page sections. Uzbek, because they show in shared URLs. */
export const SECTION_IDS = {
  listings: "takliflar",
  map: "xarita",
  howItWorks: "qanday-ishlaydi",
  why: "afzalliklar",
  owners: "egalar-uchun",
  app: "ilova",
  faq: "savollar",
} as const;

export const ROUTES = {
  home: "/",
  map: "/map",
  listProperty: "/list-property",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  credits: "/credits",
  property: (id: string) => `/property/${encodeURIComponent(id)}`,
} as const;

export type NavLink = { label: string; href: string };

export function primaryNavLinks(nav: Dictionary["nav"]): NavLink[] {
  return [
    { label: nav.home, href: ROUTES.home },
    { label: nav.buy, href: `/?listing_type=sale#${SECTION_IDS.listings}` },
    { label: nav.rent, href: `/?listing_type=rent#${SECTION_IDS.listings}` },
    { label: nav.map, href: `/#${SECTION_IDS.map}` },
    { label: nav.howItWorks, href: `/#${SECTION_IDS.howItWorks}` },
  ];
}
