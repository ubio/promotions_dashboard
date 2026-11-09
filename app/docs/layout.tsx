import type { Metadata } from "next";
import { DocsNav, DocsPager } from "@/components/docs/DocsNav";
import { requireInternalSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Docs · UBIO Promotions",
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <aside className="md:sticky md:top-6 md:w-56 md:shrink-0">
        <DocsNav />
      </aside>
      <div className="min-w-0 flex-1">
        <article className="docs-prose rounded-lg border border-line bg-card px-5 py-6 sm:px-8">
          {children}
        </article>
        <DocsPager />
      </div>
    </div>
  );
}
