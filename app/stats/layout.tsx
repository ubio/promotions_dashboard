import { StatsNav } from "@/components/stats/StatsNav";
import { requireInternalSession } from "@/lib/auth";

export default async function StatsLayout({ children }: { children: React.ReactNode }) {
  await requireInternalSession();
  return (
    <div data-full-width className="space-y-4">
      <StatsNav />
      {children}
    </div>
  );
}
