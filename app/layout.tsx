import type { Metadata } from "next";
import { Sidebar, type NavGroup } from "@/components/Sidebar";
import { getPreviewClientId, getSessionUser } from "@/lib/auth";
import { GOOGLE_BILLING_PATH, GOOGLE_CLIENT_ID } from "@/lib/client-portal-path";
import { isAuthDisabled, type SessionUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "UBIO Promotions",
  description: "UBIO promotions vertical — jobs, promotions and validation evidence",
};

// Grouped the way the rest of the suite groups: a label says what the group is
// for, so seven flat links become four short lists you can scan.
const INTERNAL_NAV: NavGroup[] = [
  { label: "Today", items: [{ href: "/", label: "Overview" }] },
  {
    label: "Validations",
    items: [
      { href: "/validations/runs", label: "Runs" },
      { href: "/reports", label: "Reports" },
      { href: "/stats/clients", label: "Stats", match: "/stats" },
    ],
  },
  { label: "Promotions", items: [{ href: "/promotions/extracted", label: "Extracted" }] },
  { label: "Billing", items: [{ href: GOOGLE_BILLING_PATH, label: "Google" }] },
  { label: "Preview", items: [{ href: "/portal/preview", label: "Client view", match: "/portal" }] },
];

const CLIENT_NAV: NavGroup[] = [
  {
    label: "Your offers",
    items: [
      { href: "/portal", label: "Overview" },
      { href: "/portal/promotions", label: "Offers" },
    ],
  },
];

const GOOGLE_CLIENT_NAV: NavGroup[] = [
  { label: "Billing", items: [{ href: GOOGLE_BILLING_PATH, label: "Billing" }] },
];

function initials(user: SessionUser): string {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function SidebarFooter({ user, clientId }: { user: SessionUser; clientId?: string }) {
  return (
    <div className="user-block">
      <span className="avatar">{initials(user)}</span>
      <span className="min-w-0">
        <strong>{user.name || user.email}</strong>
        <small>{clientId ? `${clientId} · client view` : "Read-only"}</small>
      </span>
      {isAuthDisabled() ? (
        <span className="ml-auto rounded bg-warn-bg px-2 py-0.5 text-xs text-warn">
          auth off
        </span>
      ) : (
        <form action="/api/auth/logout" method="post" className="ml-auto">
          <button
            className="rounded px-2 py-1 text-xs text-muted hover:bg-tint hover:text-ink"
            title="Sign out"
          >
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const previewingClientId = await getPreviewClientId();
  const googleClientView =
    previewingClientId === GOOGLE_CLIENT_ID ||
    (user?.role === "client" && user.clientId === GOOGLE_CLIENT_ID);
  const clientView = user?.role === "client" || Boolean(previewingClientId);
  const clientId = user?.role === "client" ? user.clientId : (previewingClientId ?? undefined);

  const groups = googleClientView
    ? GOOGLE_CLIENT_NAV
    : clientView
      ? CLIENT_NAV
      : INTERNAL_NAV;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        {/* Signed out (i.e. /login) shows no chrome at all — the nav names our
            internal pages, which is more than a stranger at the door should see. */}
        {user ? (
          <div className="flex min-h-screen">
            <Sidebar
              groups={groups}
              footer={<SidebarFooter user={user} clientId={clientId} />}
            />
            <div className="workarea flex min-h-screen flex-col">
              {previewingClientId && (
                <div className="flex flex-wrap items-center justify-center gap-3 border-b border-warn-line bg-warn-bg px-4 py-1.5 text-xs font-medium text-warn">
                  <span>
                    Previewing the client view as <strong>{previewingClientId}</strong> — this is
                    what they see
                  </span>
                  <a
                    href="/api/view-as"
                    className="rounded border border-warn-line px-2 py-0.5 hover:bg-warn-line/40"
                  >
                    Exit preview
                  </a>
                </div>
              )}
              <div className="page-content flex-1">{children}</div>
            </div>
          </div>
        ) : (
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        )}
      </body>
    </html>
  );
}
