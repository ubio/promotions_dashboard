import { toCsv } from "./csv";
import { formatCost, formatDate, formatDuration } from "./format";
import {
  getBatchMeta,
  getReport,
  sortBatchRowsByReceived,
  type GroupBy,
  type ReportFilters,
  type ReportRow,
  type ReportTotals,
} from "./reports";
import { ratesConfigured } from "./rates";

export const REPORT_GROUP_LABELS: Record<GroupBy, string> = {
  client: "Customer",
  merchant: "Merchant",
  day: "Day",
  month: "Month",
  year: "Year",
  batch: "Batch",
};

function avgTimeCell(r: ReportRow | ReportTotals): string {
  if (r.timedRuns === 0) return "";
  return `${(r.avgTimeMs / 1000).toFixed(1)}s`;
}

function llmCostCell(r: ReportRow | ReportTotals): string {
  const formatted = formatCost(r.cost);
  return formatted === "—" ? "" : formatted;
}

function revenueCell(r: ReportRow | ReportTotals): string {
  if (r.revenue == null) return "";
  return `$${r.revenue.toFixed(2)}`;
}

export async function buildReportSummaryCsv(filters: ReportFilters): Promise<string> {
  const groupBy = filters.groupBy ?? "client";
  const isBatch = groupBy === "batch";
  const showRevenue = ratesConfigured();

  const { rows: rawRows, totals } = await getReport(filters);
  const batchMeta = isBatch ? await getBatchMeta(rawRows.map((row) => row.key)) : new Map();
  const rows = isBatch ? sortBatchRowsByReceived(rawRows, batchMeta) : rawRows;

  const headers = [
    REPORT_GROUP_LABELS[groupBy],
    ...(isBatch ? ["Received", "Delivered", "Turnaround"] : []),
    "Runs",
    "Reached result",
    "No result",
    "Client-facing",
    "Automation issues",
    "Other",
    "Avg time",
    "LLM Cost",
    ...(showRevenue ? ["Revenue"] : []),
  ];

  const toLine = (label: string, row: ReportRow | ReportTotals, key?: string) => {
    const cells: unknown[] = [label];
    if (isBatch) {
      const meta = key ? batchMeta.get(key) : undefined;
      const turnaround =
        meta?.receivedAt && meta?.deliveredAt ? meta.deliveredAt - meta.receivedAt : null;
      cells.push(
        meta?.receivedAt ? formatDate(meta.receivedAt) : "",
        meta?.deliveredAt ? formatDate(meta.deliveredAt) : "",
        turnaround == null ? "" : formatDuration(turnaround)
      );
    }
    cells.push(
      row.runs,
      row.resolved,
      row.noResult,
      row.clientFacing,
      row.automationIssues,
      row.other,
      avgTimeCell(row),
      llmCostCell(row)
    );
    if (showRevenue) cells.push(revenueCell(row));
    return cells;
  };

  return toCsv(headers, [
    ...rows.map((row) => toLine(row.key, row, row.key)),
    toLine("Total", totals),
  ]);
}
