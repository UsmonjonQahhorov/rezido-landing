import Link from "next/link";

import { SimplePage } from "@/components/layout/SimplePage";
import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";

export default function NotFound() {
  const dict = getDictionary();
  return (
    <SimplePage eyebrow="404" title={dict.notFound.title} lead={dict.notFound.body}>
      <Link href="/" className={buttonClasses({ variant: "primary", className: "mt-10" })}>
        {dict.common.backHome}
      </Link>
    </SimplePage>
  );
}
