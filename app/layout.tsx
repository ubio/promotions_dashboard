import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="bg-slate-900 text-white">
          <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-8">
            <Link href="/" className="font-semibold tracking-tight">
              UBIO <span className="text-sky-400">Promotions</span>
            </Link>
            <nav className="flex gap-5 text-sm text-slate-300">
              <Link href="/jobs" className="hover:text-white">
                Jobs
              </Link>
              <Link href="/promotions" className="hover:text-white">
                Promotions
              </Link>
            </nav>
            <span className="ml-auto text-xs text-slate-500">read-only</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 flex-1">{children}</main>
      </body>
    </html>
  );
}
