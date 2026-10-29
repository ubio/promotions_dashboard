"use client";

import { Fragment, useState } from "react";
import { TableHeaderLabel } from "@/components/HelpHint";

interface DayCountryRow {
  code: string;
  label: string;
  cells: string[];
}

interface DayRow {
  date: string;
  label: string;
  cells: string[];
  countries: DayCountryRow[];
}

function valueClass(index: number, count: number, pad: string): string {
  const gap = index === count - 1 ? "" : "pr-4";
  return `whitespace-nowrap ${pad} ${gap}`.trim();
}

export default function GoogleBillingDayTable({
  headers,
  days,
  totals,
}: {
  headers: { label: string; hint: string }[];
  days: DayRow[];
  totals: string[];
}) {
  const [countriesOpen, setCountriesOpen] = useState(false);
  const hasCountries = days.some((day) => day.countries.length > 0);

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">By day</h2>
        {hasCountries && (
          <button
            type="button"
            aria-expanded={countriesOpen}
            onClick={() => setCountriesOpen((open) => !open)}
            className="text-sm text-muted hover:text-text"
          >
            {countriesOpen ? "Collapse countries" : "Expand countries"}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm [font-variant-numeric:tabular-nums]">
          <thead className="text-left text-xs uppercase text-muted">
            <tr>
              {headers.map((header, index) => (
                <th key={header.label} className={index === headers.length - 1 ? "py-1" : "py-1 pr-4"}>
                  <TableHeaderLabel label={header.label} hint={header.hint} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <Fragment key={day.date}>
                <tr className="border-t border-line font-medium text-ink">
                  <td className="whitespace-nowrap py-1.5 pr-4">{day.label}</td>
                  {day.cells.map((cell, index) => (
                    <td key={headers[index + 1].label} className={valueClass(index, day.cells.length, "py-1.5")}>
                      {cell}
                    </td>
                  ))}
                </tr>
                {countriesOpen &&
                  day.countries.map((country) => (
                    <tr key={country.code} className="text-muted">
                      <td className="whitespace-nowrap py-1 pl-4 pr-4">{country.label}</td>
                      {country.cells.map((cell, index) => (
                        <td key={headers[index + 1].label} className={valueClass(index, country.cells.length, "py-1")}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            ))}
            {days.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-faint">
                  No Google daily stats in this period.
                </td>
              </tr>
            )}
          </tbody>
          {days.length > 0 && (
            <tfoot className="border-t border-line font-semibold text-ink">
              <tr>
                <td className="py-2 pr-4">Total</td>
                {totals.map((cell, index) => (
                  <td key={headers[index + 1].label} className={valueClass(index, totals.length, "py-2")}>
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
