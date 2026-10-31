import { MapPin } from "lucide-react";
import Image from "next/image";

import { PHOTOS } from "@/data/photos";
import { getDictionary } from "@/i18n";

import { HeroSearchForm } from "./HeroSearchForm";

export function Hero() {
  const dict = getDictionary();
  const { hero, listings } = dict;

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="container-page grid grid-cols-1 gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-12 lg:pt-16">
        <div className="flex flex-col lg:col-span-6 lg:pt-6">
          <p className="eyebrow text-primary-strong">{hero.eyebrow}</p>
          <h1
            id="hero-title"
            className="mt-5 font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.04em] text-ink text-balance sm:text-6xl lg:text-[4.25rem]"
          >
            {hero.titleLead} <span className="text-primary">{hero.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted text-pretty">{hero.lead}</p>

          <HeroSearchForm
            className="mt-8 lg:mt-10"
            propertyTypeLabels={dict.propertyTypes}
            labels={{
              searchLabel: hero.searchLabel,
              dealLabel: hero.dealLabel,
              buy: hero.buy,
              rent: hero.rent,
              location: hero.location,
              locationPlaceholder: hero.locationPlaceholder,
              propertyType: hero.propertyType,
              allTypes: listings.allTypes,
              budget: hero.budget,
              anyBudget: hero.anyBudget,
              priceUpTo: listings.priceUpTo,
              som: dict.common.som,
              submit: hero.submit,
            }}
          />
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:min-h-[600px]">
            <Image
              src={PHOTOS.tashkentResidentialBrick.image}
              alt={hero.imageAlt}
              fill
              preload
              placeholder="blur"
              sizes="(min-width: 1280px) 600px, (min-width: 1024px) 48vw, 100vw"
              className="object-cover object-[50%_40%]"
            />
            <p className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-sm bg-surface/90 px-2.5 py-1.5 font-mono text-xs text-ink">
              <MapPin aria-hidden="true" className="size-3.5 text-primary-strong" />
              {hero.imageCaption}
            </p>
          </div>

          <div className="absolute -bottom-8 right-4 w-[44%] max-w-64 overflow-hidden rounded-lg border-4 border-background bg-surface shadow-floating sm:right-6 lg:-left-12 lg:right-auto lg:bottom-10 lg:w-60">
            <div className="relative aspect-[4/3]">
              <Image
                src={PHOTOS.livingRoomModern.image}
                alt={hero.insetAlt}
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 240px, 44vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
