import Link from "next/link";

import { SimplePage } from "@/components/layout/SimplePage";
import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { SECTION_IDS } from "@/lib/site";

export default function PropertyNotFound() {
  const dict = getDictionary();
  return (
    <SimplePage eyebrow="404" title={dict.propertyPage.notFoundTitle} lead={dict.propertyPage.notFoundBody}>
      <Link href={`/#${SECTION_IDS.listings}`} className={buttonClasses({ variant: "primary", className: "mt-10" })}>
        {dict.propertyPage.back}
      </Link>
    </SimplePage>
  );
}
