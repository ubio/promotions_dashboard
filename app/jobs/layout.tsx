import { requireInternalSession } from "@/lib/auth";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
