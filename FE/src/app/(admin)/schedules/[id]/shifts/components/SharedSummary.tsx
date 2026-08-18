"use client";

import React from "react";
import { HourlyTransaction } from "@/services/schedule";
import { DayOfWeek } from "@/services/common"
import { TRANSACTIONS_PER_STAFF_HOUR } from "@/const/txns-per-staff-hour";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

export const ORDERED_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export function shiftHours(start: string, end: string): string[] {
  const startH = Number(start.split(":")[0]);
  const endH = Number(end.split(":")[0]);
  const hours: string[] = [];
  for (let h = startH; h < endH; h++) {
    hours.push(`${String(h).padStart(2, "0")}:00`);
  }
  return hours;
}

export interface SummaryShift {
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  staffCount: number;
}

// ---------------------------------------------------------------------------
// Hourly Notices / Warnings Calculation
// ---------------------------------------------------------------------------

export interface HourlyNotice {
  dayOfWeek: DayOfWeek;
  hour: string;
  type: "UNDERSTAFFED" | "UNUSED_CAPACITY";
  demand: number;
  assignedStaff: number; // x
  requiredStaff: number; // ceil(demand / N)
  capacity: number; // x * N
  message: string;
}

export function calculateHourlyNotices(
  txnDays: Record<DayOfWeek, HourlyTransaction[]>,
  shiftStaffCounts: SummaryShift[],
  N: number = TRANSACTIONS_PER_STAFF_HOUR
): HourlyNotice[] {
  const txnLookup: Record<string, Record<string, number>> = {};
  for (const day of ORDERED_DAYS) {
    txnLookup[day] = {};
    for (const entry of txnDays[day] ?? []) {
      txnLookup[day][entry.hour] = entry.transactions;
    }
  }

  const staffLookup: Record<string, Record<string, number>> = {};
  for (const day of ORDERED_DAYS) staffLookup[day] = {};
  for (const s of shiftStaffCounts) {
    for (const h of shiftHours(s.start, s.end)) {
      staffLookup[s.dayOfWeek][h] = (staffLookup[s.dayOfWeek][h] ?? 0) + s.staffCount;
    }
  }

  const allHoursSet = new Set<string>();
  for (const day of ORDERED_DAYS) {
    for (const h of Object.keys(txnLookup[day] ?? {})) allHoursSet.add(h);
    for (const h of Object.keys(staffLookup[day] ?? {})) allHoursSet.add(h);
  }
  const allHours = [...allHoursSet].sort();

  const notices: HourlyNotice[] = [];

  for (const day of ORDERED_DAYS) {
    for (const h of allHours) {
      const demand = txnLookup[day][h] ?? 0;
      const x = staffLookup[day][h] ?? 0;
      const req = Math.ceil(demand / N);

      // Under-staffed when demand > x * N
      if (demand > x * N) {
        const shortage = req - x;
        notices.push({
          dayOfWeek: day,
          hour: h,
          type: "UNDERSTAFFED",
          demand,
          assignedStaff: x,
          requiredStaff: req,
          capacity: x * N,
          message: `${DAY_LABELS[day]} ${h}: Under-staffed — Demand is ${demand} txns (capacity is ${x * N} with ${x} staff). Needs ${req} staff (shortage of ${shortage}).`,
        });
      }
      // Unused Capacity when x > ceil(demand / N)
      else if (x > req) {
        const excess = x - req;
        notices.push({
          dayOfWeek: day,
          hour: h,
          type: "UNUSED_CAPACITY",
          demand,
          assignedStaff: x,
          requiredStaff: req,
          capacity: x * N,
          message: `${DAY_LABELS[day]} ${h}: Unused Capacity — ${x} staff assigned (${x * N} txn capacity), but demand is ${demand} txns (${req} staff needed, ${excess} excess staff).`,
        });
      }
    }
  }

  return notices;
}

export function HourlyNoticesPanel({ notices }: { notices: HourlyNotice[] }) {
  if (notices.length === 0) return null;

  const understaffed = notices.filter((n) => n.type === "UNDERSTAFFED");
  const unused = notices.filter((n) => n.type === "UNUSED_CAPACITY");

  return (
    <div className="space-y-3">
      {understaffed.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/10">
          <div className="flex items-center gap-2 border-b border-red-100 px-4 py-2.5 dark:border-red-800/30">
            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">
              Under-staffed Hours ({understaffed.length})
            </span>
          </div>
          <ul className="space-y-1 px-4 py-2.5">
            {understaffed.map((n, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400">{n.message}</li>
            ))}
          </ul>
        </div>
      )}
      {unused.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 border-b border-amber-100 px-4 py-2.5 dark:border-amber-800/30">
            <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Unused Capacity Hours ({unused.length})
            </span>
          </div>
          <ul className="space-y-1 px-4 py-2.5">
            {unused.map((n, i) => (
              <li key={i} className="text-xs text-amber-600 dark:text-amber-400">{n.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aggregated Summary Table
// ---------------------------------------------------------------------------

interface AggregatedSummaryProps {
  txnDays: Record<DayOfWeek, { hour: string; transactions: number }[]>;
  shiftStaffCounts: SummaryShift[];
}

export function AggregatedSummary({ txnDays, shiftStaffCounts }: AggregatedSummaryProps) {
  const txnLookup: Record<string, Record<string, number>> = {};
  for (const day of ORDERED_DAYS) {
    txnLookup[day] = {};
    for (const entry of txnDays[day] ?? []) {
      txnLookup[day][entry.hour] = entry.transactions;
    }
  }

  const staffLookup: Record<string, Record<string, number>> = {};
  for (const day of ORDERED_DAYS) staffLookup[day] = {};
  for (const s of shiftStaffCounts) {
    for (const h of shiftHours(s.start, s.end)) {
      staffLookup[s.dayOfWeek][h] = (staffLookup[s.dayOfWeek][h] ?? 0) + s.staffCount;
    }
  }

  const allHoursSet = new Set<string>();
  for (const day of ORDERED_DAYS) {
    for (const h of Object.keys(txnLookup[day] ?? {})) allHoursSet.add(h);
    for (const h of Object.keys(staffLookup[day] ?? {})) allHoursSet.add(h);
  }
  const allHours = [...allHoursSet].sort();

  if (allHours.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        No transaction data or shift data available for summary.
      </p>
    );
  }

  let totalTxns = 0;
  let totalStaffHrs = 0;
  const nonZeroCellRatios: number[] = [];

  for (const day of ORDERED_DAYS) {
    for (const h of allHours) {
      const t = txnLookup[day][h] ?? 0;
      const s = staffLookup[day][h] ?? 0;
      totalTxns += t;
      totalStaffHrs += s;
      if (s > 0) nonZeroCellRatios.push(t / s);
    }
  }

  const overallRatio = totalStaffHrs > 0 ? totalTxns / totalStaffHrs : null;
  const avgRatio =
    nonZeroCellRatios.length > 0
      ? nonZeroCellRatios.reduce((a, b) => a + b, 0) / nonZeroCellRatios.length
      : null;

  return (
    <div className="space-y-4">
      {/* Weekly totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Transactions", value: totalTxns.toLocaleString() },
          { label: "Total Staff Hours", value: totalStaffHrs.toLocaleString() },
          {
            label: "Overall Txns/Staff-Hr",
            value: overallRatio !== null ? overallRatio.toFixed(1) : "–",
          },
          {
            label: "Avg Txns/Staff-Hr",
            value: avgRatio !== null ? avgRatio.toFixed(1) : "–",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {metric.label}
            </p>
            <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <th className="px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-300">Hour</th>
              {ORDERED_DAYS.map((day) => (
                <th
                  key={day}
                  colSpan={3}
                  className="border-l border-gray-100 px-3 py-2.5 text-center font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300"
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
              <th className="px-3 py-1.5 text-[10px] text-gray-400"></th>
              {ORDERED_DAYS.map((day) => (
                <React.Fragment key={day}>
                  <th className="border-l border-gray-100 px-2 py-1.5 text-[10px] font-medium text-gray-400 dark:border-gray-800">Txns</th>
                  <th className="px-2 py-1.5 text-[10px] font-medium text-gray-400">Staff-Hrs</th>
                  <th className="px-2 py-1.5 text-[10px] font-medium text-gray-400">Txn/SH</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {allHours.map((h) => (
              <tr key={h} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">{h}</td>
                {ORDERED_DAYS.map((day) => {
                  const txns = txnLookup[day][h] ?? 0;
                  const staffHrs = staffLookup[day][h] ?? 0;
                  const ratio = staffHrs > 0 ? (txns / staffHrs).toFixed(1) : "–";
                  const req = Math.ceil(txns / TRANSACTIONS_PER_STAFF_HOUR);
                  const isUnderstaffed = txns > staffHrs * TRANSACTIONS_PER_STAFF_HOUR;
                  const isUnused = staffHrs > req;

                  let cellClass = "text-gray-700 dark:text-gray-300";
                  let titleAttr = "";
                  if (isUnderstaffed) {
                    cellClass = "bg-red-200 text-red-700 font-semibold dark:bg-red-900 dark:text-red-300";
                    titleAttr = `Under-staffed: ${txns} txns > ${staffHrs * TRANSACTIONS_PER_STAFF_HOUR} capacity (${staffHrs} staff)`;
                  } else if (isUnused) {
                    cellClass = "bg-amber-100 text-amber-700 font-medium dark:bg-amber-900/40 dark:text-amber-300";
                    titleAttr = `Unused capacity: ${staffHrs} staff assigned > ${req} required (${txns} txns)`;
                  }

                  return (
                    <React.Fragment key={day}>
                      <td title={titleAttr} className={`border-l border-gray-50 px-2 py-2 text-center ${cellClass}`}>
                        {txns}
                      </td>
                      <td title={titleAttr} className={`px-2 py-2 text-center ${cellClass}`}>
                        {staffHrs > 0 ? staffHrs : "–"}
                      </td>
                      <td title={titleAttr} className={`px-2 py-2 text-center ${cellClass}`}>
                        {ratio}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
