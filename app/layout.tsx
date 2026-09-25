import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getPreviewClientId, getSessionUser } from "@/lib/auth";
import { isAuthDisabled } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promotions Dashboard",
  description: "UBIO promotions vertical — jobs, promotions and validation evidence",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const previewingClientId = await getPreviewClientId();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {previewingClientId && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-b border-warn-line bg-warn-bg px-4 py-1.5 text-xs font-medium text-warn">
            <span>
              Previewing the client view as <strong>{previewingClientId}</strong> — this is what
              they see
            </span>
            <a href="/api/view-as" className="rounded border border-warn-line px-2 py-0.5 hover:bg-warn-line/40">
              Exit preview
            </a>
          </div>
        )}
        {/* Signed out (i.e. /login) shows no chrome at all — the nav names our
            internal pages, which is more than a stranger at the door should see. */}
        {user && (
        <header className="border-b border-line bg-card text-ink">
          <div className="w-full px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <Link href={user.role === "client" || previewingClientId ? "/portal" : "/"}>
              <Logo />
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {user.role === "client" || previewingClientId ? (
                <>
                  <Link href="/portal" className="hover:text-ink">
                    Overview
                  </Link>
                  <Link href="/portal/promotions" className="hover:text-ink">
                    Offers
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/" className="hover:text-ink">
                    Overview
                  </Link>
                  <Link href="/reports" className="hover:text-ink">
                    Reports
                  </Link>
                  <Link href="/stats/clients" className="hover:text-ink">
                    Stats
                  </Link>
                  <Link href="/portal/preview" className="text-faint hover:text-ink">
                    Client view
                  </Link>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-xs text-muted">
              {user.role === "client" ? (
                <span className="rounded bg-primary-tint px-2 py-0.5 font-medium text-primary-ink">
                  {user.clientId} · client view
                </span>
              ) : (
                <span className="hidden sm:inline text-faint">read-only</span>
              )}
              {isAuthDisabled() ? (
                <span className="rounded bg-warn-bg px-2 py-0.5 text-warn">auth disabled</span>
              ) : (
                user && (
                  <>
                    <span className="hidden sm:inline text-text-2">{user.email}</span>
                    <form action="/api/auth/logout" method="post">
                      <button className="rounded border border-line px-2 py-1 hover:bg-tint hover:text-ink">
                        Sign out
                      </button>
                    </form>
                  </>
                )
              )}
            </div>
          </div>
        </header>
        )}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
