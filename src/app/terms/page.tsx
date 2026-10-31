import type { Metadata } from "next";

import { PendingDocumentPage } from "@/components/layout/PendingDocumentPage";
import { getDictionary } from "@/i18n";

const page = getDictionary().placeholderPages.terms;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <PendingDocumentPage heading={page.heading} body={page.body} />;
}
