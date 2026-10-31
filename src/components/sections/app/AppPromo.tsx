import { ArrowUpRight, Clock, GitCompareArrows, Heart, MapPinned, MessageSquareText, Smartphone } from "lucide-react";

import { propertyLabels } from "@/components/property/labels";
import { buttonClasses } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DEMO_LISTINGS } from "@/data/demo-listings";
import { getDictionary } from "@/i18n";
import { env } from "@/lib/env";
import { SECTION_IDS } from "@/lib/site";

import { PhonePreview } from "./PhonePreview";

const FEATURE_ICONS = [MapPinned, Heart, GitCompareArrows, MessageSquareText];

/** The sample listing the phone illustration shows. */
const PREVIEW_LISTING = DEMO_LISTINGS.find((listing) => listing.id === "namuna-mirzo-ulugbek-1-xonali-ijara") ?? DEMO_LISTINGS[0];

export function AppPromo() {
  const dict = getDictionary();
  const { app } = dict;
  const sectionId = SECTION_IDS.app;
  // Store buttons appear only once real listing URLs are configured.
  const stores = [
    { label: app.appStore, href: env.appStoreUrl },
    { label: app.googlePlay, href: env.googlePlayUrl },
  ].filter((store): store is { label: string; href: string } => store.href !== null);

  return (
    <section id={sectionId} aria-labelledby={`${sectionId}-title`} className="pb-20 sm:pb-28">
      <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="relative overflow-hidden rounded-xl bg-surface-muted px-6 pb-0 pt-12 lg:col-span-5">
          <div className="relative translate-y-6">
            {PREVIEW_LISTING ? (
              <PhonePreview labels={app} propertyLabels={propertyLabels(dict)} listing={PREVIEW_LISTING} />
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-7 lg:pl-6">
          <SectionHeading eyebrow={app.eyebrow} title={app.title} titleId={`${sectionId}-title`} lead={app.lead} />

          <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {app.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Smartphone;
              return (
                <li key={feature.title} className="flex gap-3.5">
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
                  <div>
                    <h3 className="font-display text-[17px] font-medium text-ink">{feature.title}</h3>
                    <p className="mt-1 text-[15px] text-ink-muted">{feature.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {stores.length > 0 ? (
            <div className="mt-10 flex flex-wrap gap-3">
              {stores.map((store) => (
                <a
                  key={store.label}
                  href={store.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: "secondary", size: "lg" })}
                >
                  <Smartphone aria-hidden="true" className="size-4" />
                  {store.label}
                  <ArrowUpRight aria-hidden="true" className="size-4 text-ink-muted" />
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-10 flex gap-4 rounded-lg border border-line bg-surface p-5">
              <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-strong" />
              <div>
                <p className="font-display text-[17px] font-medium text-ink">{app.statusTitle}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-muted">{app.statusBody}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
