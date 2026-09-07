// Shared by the server page and the client filter bar so both agree on ranges.
export interface Preset {
  key: string;
  label: string;
  from: string;
  to: string;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

function monthStart(offset = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    .toISOString()
    .slice(0, 10);
}

function monthEnd(offset = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export function periodPresets(): Preset[] {
  const today = utcToday();
  return [
    { key: "7d", label: "Last 7 days", from: shift(today, -6), to: today },
    { key: "30d", label: "Last 30 days", from: shift(today, -29), to: today },
    { key: "90d", label: "Last 90 days", from: shift(today, -89), to: today },
    { key: "mtd", label: "This month", from: monthStart(), to: today },
    { key: "lastMonth", label: "Last month", from: monthStart(-1), to: monthEnd(-1) },
    { key: "ytd", label: "This year", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

export function matchPreset(from: string, to: string): Preset | undefined {
  return periodPresets().find((p) => p.from === from && p.to === to);
}
