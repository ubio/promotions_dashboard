import GoogleSignIn from "@/components/GoogleSignIn";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  // Only allow internal redirect targets.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">
          UBIO <span className="text-sky-600">Promotions</span>
        </h1>
        <p className="mt-2 mb-6 text-sm text-slate-500">
          Sign in with your company account to continue.
        </p>
        {clientId ? (
          <GoogleSignIn clientId={clientId} next={target} />
        ) : (
          <p className="text-sm text-red-600">GOOGLE_OAUTH_CLIENT_ID is not configured.</p>
        )}
      </div>
    </div>
  );
}
