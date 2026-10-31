import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

type SimplePageProps = {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Layout for the short, text-first pages: placeholders, credits, listing intake. */
export function SimplePage({ eyebrow, title, lead, children, className }: SimplePageProps) {
  return (
    <div className={cx("container-page py-16 sm:py-24", className)}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow text-primary-strong">{eyebrow}</p> : null}
        <h1 className="mt-4 font-display text-[2.4rem] font-bold leading-[1.05] tracking-[-0.035em] text-ink text-balance sm:text-5xl">
          {title}
        </h1>
        {lead ? <div className="mt-6 text-lg leading-relaxed text-ink-muted text-pretty">{lead}</div> : null}
      </div>
      {children}
    </div>
  );
}
