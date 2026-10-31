"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonClasses } from "@/components/ui/button";
import { uz } from "@/i18n/dictionaries/uz";

/**
 * Route-level error boundary. Error boundaries must be Client Components, so the strings
 * come straight from the dictionary module. The error itself is logged, never shown.
 */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-24">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold tracking-[-0.03em] text-ink">{uz.error.title}</h1>
        <p className="mt-4 text-lg text-ink-muted">{uz.error.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className={buttonClasses({ variant: "primary" })}>
            {uz.common.retry}
          </button>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            {uz.common.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
