"use client";

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { useApi } from "@/hooks/useApi";
import {
  scheduleApi,
  UploadedTransactions,
} from "@/services/schedule";
import { DayOfWeek } from "@/services/common"
import { formatDate, formatDateTime } from "@/utils/formatDate";
import { useScheduleContext } from "./ScheduleContext";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDERED_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the Sunday of a week that starts on the given Monday ISO string. */
function weekEndDate(mondayIso: string): string {
  const [y, m, d] = mondayIso.split("T")[0].split("-").map(Number);
  const sunday = new Date(Date.UTC(y, m - 1, d + 6));
  return [
    sunday.getUTCFullYear(),
    String(sunday.getUTCMonth() + 1).padStart(2, "0"),
    String(sunday.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Collect all unique hour slots across all days and sort them so the table
 * rows are always in chronological order regardless of which days have data.
 */
function collectHours(txns: UploadedTransactions): string[] {
  const set = new Set<string>();
  for (const day of ORDERED_DAYS) {
    for (const entry of txns.days[day] ?? []) {
      set.add(entry.hour);
    }
  }
  return [...set].sort();
}

/**
 * Build a lookup map  { day → { hour → transactions } }
 * so table cells can be resolved in O(1).
 */
function buildLookup(
  txns: UploadedTransactions
): Record<DayOfWeek, Record<string, number>> {
  const result = {} as Record<DayOfWeek, Record<string, number>>;
  for (const day of ORDERED_DAYS) {
    result[day] = {};
    for (const entry of txns.days[day] ?? []) {
      result[day][entry.hour] = entry.transactions;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Transaction Table
// ---------------------------------------------------------------------------

interface TransactionTableProps {
  txns: UploadedTransactions;
}

function TransactionTable({ txns }: TransactionTableProps) {
  const hours = collectHours(txns);
  const lookup = buildLookup(txns);

  if (hours.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        No hourly data found in the uploaded file.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">
              Hour
            </th>
            {ORDERED_DAYS.map((day) => (
              <th
                key={day}
                className="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300"
              >
                {DAY_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {hours.map((hour) => (
            <tr
              key={hour}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                {hour}
              </td>
              {ORDERED_DAYS.map((day) => {
                const count = lookup[day][hour];
                return (
                  <td
                    key={day}
                    className="px-4 py-3 text-center text-gray-800 dark:text-white/80"
                  >
                    {count !== undefined ? count : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Section
// ---------------------------------------------------------------------------

interface UploadSectionProps {
  scheduleId: number;
  onUploaded: () => void;
}

function UploadSection({ scheduleId, onUploaded }: UploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    loading,
    error,
    execute: uploadTxns,
    reset,
  } = useApi(
    (id: number, file: File) => scheduleApi.uploadTxns(id, file),
    null as unknown as UploadedTransactions
  );

  const handleFileChange = (file: File | null) => {
    reset();
    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadTxns(scheduleId, selectedFile);
      toast.success("Transaction data uploaded successfully.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to upload file.";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Upload Transaction CSV
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Expects hourly transaction counts with one column per day of the week.
          Column order does not matter.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver
            ? "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20"
            : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-brand-700 dark:hover:bg-gray-800/40"
        }`}
      >
        <svg
          className={`h-8 w-8 ${dragOver ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {selectedFile ? (
          <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
            {selectedFile.name}
          </span>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Drop a CSV here, or{" "}
              <span className="text-brand-600 dark:text-brand-400">browse</span>
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              .csv files only
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          id="txn-file-input"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Upload button */}
      <div className="flex justify-end">
        <button
          id="upload-txns-btn"
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ScheduleDetailPage() {
  // Schedule is fetched once in the layout via ScheduleProvider — no duplicate request.
  const { schedule, loading: fetchLoading, error: fetchError, refetch } = useScheduleContext();

  // ---- Render states ----
  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (fetchError || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <svg className="mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {fetchError ?? "Schedule not found."}
        </p>
      </div>
    );
  }

  const weekEnd = weekEndDate(schedule.startDate);

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Info rows */}
      <div>
        {[
          { label: "ID", value: String(schedule.id) },
          { label: "Week Start (Mon)", value: formatDate(schedule.startDate, "UTC") },
          { label: "Week End (Sun)", value: formatDate(weekEnd, "UTC") },
          {
            label: "Transaction Data",
            value: schedule.uploadedTxns ? "Uploaded" : "Not uploaded",
            badge: true,
            hasData: !!schedule.uploadedTxns,
          },
          { label: "Created At", value: formatDateTime(schedule.createdAt) },
          { label: "Updated At", value: formatDateTime(schedule.updatedAt) },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
          >
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {row.label}
            </span>
            {row.badge ? (
              row.hasData ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Uploaded
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  Not uploaded
                </span>
              )
            ) : (
              <span className="text-sm text-gray-800 dark:text-white/90">
                {row.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Upload Section */}
      <UploadSection scheduleId={schedule.id} onUploaded={refetch} />

      {/* Transaction Data */}
      <div>
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Transaction Data
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Hourly customer transactions by day of week.
          </p>
        </div>

        {schedule.uploadedTxns ? (
          <TransactionTable txns={schedule.uploadedTxns} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No transaction data uploaded yet.
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Use the upload section above to import a CSV file.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
