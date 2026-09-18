import { StatsNav } from "@/components/stats/StatsNav";

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-full-width className="space-y-4">
      <StatsNav />
      {children}
    </div>
  );
}
