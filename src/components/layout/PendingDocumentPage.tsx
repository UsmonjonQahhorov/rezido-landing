import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";

import { SimplePage } from "./SimplePage";

/**
 * Stand-in for a legal document that has not been written. It states that the document
 * is being prepared and nothing more — no invented terms.
 */
export function PendingDocumentPage({ heading, body }: { heading: string; body: string }) {
  const dict = getDictionary();
  return (
    <SimplePage eyebrow={dict.common.comingSoon} title={heading} lead={body}>
      <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-10" })}>
        {dict.common.backHome}
      </Link>
    </SimplePage>
  );
}
