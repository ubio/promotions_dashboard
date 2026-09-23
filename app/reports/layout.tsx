import { requireInternalSession } from "@/lib/auth";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
