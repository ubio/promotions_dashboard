import { redirect } from "next/navigation";
import GoogleSignIn from "@/components/GoogleSignIn";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth";
import { isAuthDisabled } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user?.role === "client") redirect("/portal");

  // Only allow internal redirect targets.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (isAuthDisabled()) redirect(target);

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="w-full max-w-sm rounded-xl border border-line bg-card p-8 text-center shadow-sm">
        <h1 className="flex justify-center text-lg">
          <Logo size={28} />
        </h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Sign in with your company account to continue.
        </p>
        {clientId ? (
          <GoogleSignIn clientId={clientId} next={target} />
        ) : (
          <p className="text-sm text-bad">GOOGLE_OAUTH_CLIENT_ID is not configured.</p>
        )}
      </div>
    </div>
  );
}
