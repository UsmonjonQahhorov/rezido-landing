import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { getDictionary, interpolate } from "@/i18n";
import { env } from "@/lib/env";
import { listingsSource } from "@/lib/listings";
import { ROUTES, SECTION_IDS, primaryNavLinks, type NavLink } from "@/lib/site";

import { Wordmark } from "./Wordmark";

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="eyebrow text-ink-inverse/60">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[15px] text-ink-inverse/85 transition-colors hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const dict = getDictionary();
  const year = new Date().getFullYear();
  const searchLinks = primaryNavLinks(dict.nav).slice(1);
  const social = [
    { label: "Telegram", href: env.social.telegram },
    { label: "Instagram", href: env.social.instagram },
  ].filter((item): item is { label: string; href: string } => item.href !== null);

  return (
    <footer className="bg-surface-inverse text-ink-inverse">
      <div className="container-page grid grid-cols-1 gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Link href={ROUTES.home} aria-label={dict.nav.homeLink} className="inline-block rounded-md">
            <Wordmark size="lg" tone="inverse" />
          </Link>
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-inverse/70">{dict.footer.tagline}</p>
          {social.length > 0 ? (
            <div className="mt-8">
              <h2 className="eyebrow text-ink-inverse/60">{dict.footer.socialTitle}</h2>
              <ul className="mt-3 flex flex-wrap gap-4">
                {social.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[15px] text-ink-inverse/85 hover:text-white"
                    >
                      {item.label}
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7">
          <FooterColumn title={dict.footer.searchTitle} links={searchLinks} />
          <FooterColumn
            title={dict.footer.ownersTitle}
            links={[
              { label: dict.nav.listProperty, href: ROUTES.listProperty },
              { label: dict.footer.mobileApp, href: `/#${SECTION_IDS.app}` },
            ]}
          />
          <FooterColumn
            title={dict.footer.companyTitle}
            links={[
              { label: dict.footer.contact, href: ROUTES.contact },
              { label: dict.footer.privacy, href: ROUTES.privacy },
              { label: dict.footer.terms, href: ROUTES.terms },
              { label: dict.footer.credits, href: ROUTES.credits },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-ink-inverse/15">
        <div className="container-page flex flex-col gap-2 py-6 text-sm text-ink-inverse/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{interpolate(dict.footer.copyright, { year })}</p>
          {listingsSource() === "demo" ? <p>{dict.footer.demoNote}</p> : null}
        </div>
      </div>
    </footer>
  );
}
