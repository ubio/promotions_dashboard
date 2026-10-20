import { requireInternalSession } from "@/lib/auth";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
