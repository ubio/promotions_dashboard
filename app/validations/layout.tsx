import { requireInternalSession } from "@/lib/auth";

export default async function ValidationsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
