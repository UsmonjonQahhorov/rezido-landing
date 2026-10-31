import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { ROUTES, primaryNavLinks } from "@/lib/site";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  const dict = getDictionary();
  const links = primaryNavLinks(dict.nav);
  const cta = { label: dict.nav.listProperty, href: ROUTES.listProperty };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href={ROUTES.home} aria-label={dict.nav.homeLink} className="-ml-1 rounded-md px-1 py-2">
          <Wordmark />
        </Link>

        <nav aria-label={dict.nav.label} className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-3 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher current={DEFAULT_LOCALE} labels={dict.language} />
          <div className="hidden sm:block">
            <Link href={cta.href} className={buttonClasses({ variant: "primary", size: "sm" })}>
              {cta.label}
            </Link>
          </div>
          <MobileNav
            links={links}
            cta={cta}
            currentLocale={DEFAULT_LOCALE}
            labels={{
              open: dict.nav.openMenu,
              close: dict.nav.closeMenu,
              navigation: dict.nav.label,
              language: dict.language.label,
              soon: dict.language.soon,
            }}
          />
        </div>
      </div>
    </header>
  );
}
