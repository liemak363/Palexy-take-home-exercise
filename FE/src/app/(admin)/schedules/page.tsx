"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useApi, useApiEffect } from "@/hooks/useApi";
import { scheduleApi, ScheduleListResult, ScheduleOverview } from "@/services/schedule";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatDateTime } from "@/utils/formatDate"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LIMIT = 10;

const emptyResult: ScheduleListResult = {
  items: [],
  total: 0,
  page: 1,
  limit: LIMIT,
};

/** Given any date string (YYYY-MM-DD), return the Monday of that week. */
function toNearestPreviousMonday(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  // Use UTC to stay timezone-neutral
  const d = new Date(Date.UTC(year, month - 1, day));
  const dow = d.getUTCDay(); // 0=Sun 1=Mon … 6=Sat
  const sub = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - sub);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---------------------------------------------------------------------------
// Create Schedule Modal
// ---------------------------------------------------------------------------

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (schedule: ScheduleOverview) => void;
}

// Always rendered only when open, so state starts fresh on every mount.
function CreateScheduleModal({ onClose, onCreated }: Omit<CreateScheduleModalProps, "isOpen">) {
  const [dateInput, setDateInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Derived preview of the Monday that will actually be stored
  const mondayPreview = dateInput ? toNearestPreviousMonday(dateInput) : null;
  const isAlreadyMonday = mondayPreview === dateInput;

  const {
    loading,
    error,
    execute: createSchedule,
  } = useApi(scheduleApi.create, null as unknown as ScheduleOverview);

  // Focus the input once on mount (no setState here — avoids cascading-render lint error)
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;

    try {
      const created = await createSchedule({ startDate: dateInput });
      toast.success(
        `Schedule created — week of ${formatDate(created.startDate)}`
      );
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to create schedule.";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        New Schedule
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        A schedule covers one full week (Mon – Sun).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Date Input */}
        <div>
          <label
            htmlFor="schedule-start-date"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Pick any day in the week
          </label>
          <input
            ref={inputRef}
            id="schedule-start-date"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            required
            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          />

          {/* Monday preview hint */}
          {mondayPreview && (
            <p
              className={`mt-2 flex items-center gap-1.5 text-xs ${
                isAlreadyMonday
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {isAlreadyMonday ? (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.415L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Already a Monday — start date will be{" "}
                  <strong>{formatDate(mondayPreview)}</strong>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Start date will be snapped to the previous Monday:{" "}
                  <strong>{formatDate(mondayPreview)}</strong>
                </>
              )}
            </p>
          )}
        </div>

        {/* API error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !dateInput}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {loading ? "Creating…" : "Create Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSchedules = useCallback(
    (p: number, l: number) => scheduleApi.getAll(p, l),
    []
  );

  const {
    data: result,
    loading,
    error,
    refetch,
  } = useApiEffect(
    fetchSchedules,
    emptyResult,
    [page, LIMIT] as [number, number],
    (err) => {
      toast.error(err?.message ?? "Failed to load schedules.");
    },
    [page]
  );

  const { items, total } = result;
  const totalPages = Math.ceil(total / LIMIT);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleCreated = () => {
    // Go to page 1 and refetch so the newly created schedule is visible
    if (page !== 1) {
      setPage(1); // useApiEffect will refetch automatically
    } else {
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Schedules
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and manage all work schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            title="Refresh"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <button
            id="open-create-schedule-modal"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Schedule
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No schedules found
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Create your first schedule to get started.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Schedule
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Week Starting (Mon)</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Week Ending (Sun)</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((schedule) => {
                      // Compute Sunday = Monday + 6 days (UTC)
                      const [sy, sm, sd] = schedule.startDate.split("T")[0].split("-").map(Number);
                      const sunday = new Date(Date.UTC(sy, sm - 1, sd + 6));
                      const sundayStr = [
                        sunday.getUTCFullYear(),
                        String(sunday.getUTCMonth() + 1).padStart(2, "0"),
                        String(sunday.getUTCDate()).padStart(2, "0"),
                      ].join("-");

                      return (
                        <tr
                          key={schedule.id}
                          className="group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                              {schedule.id}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-800 dark:text-white/90">
                            {formatDate(schedule.startDate, "UTC")}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {formatDate(sundayStr, "UTC")}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {formatDateTime(schedule.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Page <strong className="text-gray-800 dark:text-white">{page}</strong>{" "}
            of{" "}
            <strong className="text-gray-800 dark:text-white">{totalPages}</strong>
            {" · "}
            <span>{total} total</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create Modal — conditionally rendered so it remounts fresh each time */}
      {modalOpen && (
        <Modal isOpen onClose={() => setModalOpen(false)} className="max-w-md mx-4 sm:mx-auto">
          <CreateScheduleModal
            onClose={() => setModalOpen(false)}
            onCreated={handleCreated}
          />
        </Modal>
      )}
    </div>
  );
}
