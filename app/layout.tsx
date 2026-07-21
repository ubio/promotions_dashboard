import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
            <Link href={user?.role === "client" ? "/portal" : "/"} className="font-semibold tracking-tight whitespace-nowrap">
              UBIO <span className="text-sky-400">Promotions</span>
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
              {user?.role === "client" ? (
                <>
                  <Link href="/portal" className="hover:text-white">
                    Overview
                  </Link>
                  <Link href="/portal/promotions" className="hover:text-white">
                    Promotions
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/stats" className="hover:text-white">
                    Stats
                  </Link>
                  <Link href="/jobs" className="hover:text-white">
                    Jobs
                  </Link>
                  <Link href="/promotions" className="hover:text-white">
                    Promotions
                  </Link>
                  <Link href="/merchants" className="hover:text-white">
                    Merchants
                  </Link>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              {user?.role === "client" ? (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">{user.clientId}</span>
              ) : (
                <span className="hidden sm:inline text-slate-500">read-only</span>
              )}
              {user && (
                <>
                  <span className="hidden sm:inline text-slate-300">{user.email}</span>
                  <form action="/api/auth/logout" method="post">
                    <button className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800 hover:text-white">
                      Sign out
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
