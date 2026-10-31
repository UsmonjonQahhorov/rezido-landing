import type { Metadata } from "next";
import Link from "next/link";

import { SimplePage } from "@/components/layout/SimplePage";
import { buttonClasses } from "@/components/ui/button";
import { getDictionary } from "@/i18n";
import { env } from "@/lib/env";

const dict = getDictionary();
const page = dict.placeholderPages.contact;
const hasContact = Boolean(env.contactEmail || env.contactPhone);

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/contact" },
  // Until real contact details are configured the page is a placeholder.
  robots: hasContact ? undefined : { index: false, follow: true },
};

/** Shows only the contact details configured in the environment; none are invented. */
export default function ContactPage() {
  return (
    <SimplePage title={page.heading} lead={hasContact ? undefined : page.body}>
      {hasContact ? (
        <dl className="mt-10 max-w-xl divide-y divide-line border-y border-line">
          {env.contactEmail ? (
            <div className="flex flex-wrap justify-between gap-2 py-4">
              <dt className="text-ink-muted">{page.emailLabel}</dt>
              <dd>
                <a href={`mailto:${env.contactEmail}`} className="font-mono text-ink hover:text-primary-strong">
                  {env.contactEmail}
                </a>
              </dd>
            </div>
          ) : null}
          {env.contactPhone ? (
            <div className="flex flex-wrap justify-between gap-2 py-4">
              <dt className="text-ink-muted">{page.phoneLabel}</dt>
              <dd>
                <a
                  href={`tel:${env.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="font-mono text-ink hover:text-primary-strong"
                >
                  {env.contactPhone}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Link href="/" className={buttonClasses({ variant: "secondary", className: "mt-10" })}>
        {dict.common.backHome}
      </Link>
    </SimplePage>
  );
}
