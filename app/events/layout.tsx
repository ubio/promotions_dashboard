import { requireInternalSession } from "@/lib/auth";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return children;
}
