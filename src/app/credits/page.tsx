import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { SimplePage } from "@/components/layout/SimplePage";
import { PHOTOS } from "@/data/photos";
import { getDictionary } from "@/i18n";

const dict = getDictionary();
const page = dict.credits;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: "/credits" },
};

/** Attribution for every photograph on the site, as CC BY and CC BY-SA require. */
export default function CreditsPage() {
  return (
    <SimplePage title={page.heading} lead={page.lead}>
      <ul className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(PHOTOS).map(([id, photo]) => (
          <li key={id}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted">
              <Image
                src={photo.image}
                alt={photo.alt}
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <p className="mt-3 font-display text-[17px] font-medium text-ink">{photo.credit.title}</p>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink-muted">{page.author}</dt>
              <dd className="text-ink">{photo.credit.author}</dd>
              <dt className="text-ink-muted">{page.license}</dt>
              <dd>
                {photo.credit.licenseUrl ? (
                  <a
                    href={photo.credit.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer license"
                    className="font-mono text-primary-strong underline-offset-2 hover:underline"
                  >
                    {photo.credit.license}
                  </a>
                ) : (
                  <span className="font-mono text-ink">{photo.credit.license}</span>
                )}
              </dd>
              <dt className="text-ink-muted">{page.source}</dt>
              <dd>
                <a
                  href={photo.credit.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary-strong underline-offset-2 hover:underline"
                >
                  Wikimedia Commons
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              </dd>
            </dl>
          </li>
        ))}
      </ul>
    </SimplePage>
  );
}
