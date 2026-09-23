import { requireInternalSession } from "@/lib/auth";

export default async function PromotionsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
