import { AppPromo } from "@/components/sections/app/AppPromo";
import { Faq } from "@/components/sections/Faq";
import { Hero } from "@/components/sections/hero/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ListingsSection } from "@/components/sections/listings/ListingsSection";
import { MapSection } from "@/components/sections/MapSection";
import { OwnersCta } from "@/components/sections/OwnersCta";
import { WhyRezido } from "@/components/sections/WhyRezido";
import { searchListings } from "@/lib/listings";
import type { ListingsResult } from "@/lib/listings/types";

/** With the API connected, the prerendered listings refresh at most every five minutes. */
export const revalidate = 300;

async function loadInitialListings(): Promise<ListingsResult | null> {
  try {
    return await searchListings();
  } catch (error) {
    // The page still renders; the explorer retries from the browser and shows an error
    // state with a retry action if the API stays unavailable.
    console.error("[home] Could not load listings", error);
    return null;
  }
}

export default async function HomePage() {
  const listings = await loadInitialListings();

  return (
    <>
      <Hero />
      <ListingsSection initial={listings} />
      <MapSection listings={listings} />
      <HowItWorks />
      <WhyRezido />
      <OwnersCta />
      <AppPromo />
      <Faq />
    </>
  );
}
