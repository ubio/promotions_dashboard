import { requireGoogleBillingSession } from "@/lib/auth";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  await requireGoogleBillingSession();
  return children;
}
