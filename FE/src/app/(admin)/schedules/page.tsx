"use client";

import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { useApiEffect } from "@/hooks/useApi";
import { scheduleApi, ScheduleListResult } from "@/services/schedule";

const LIMIT = 10;

const emptyResult: ScheduleListResult = {
  items: [],
  total: 0,
  page: 1,
  limit: LIMIT,
};

export default function SchedulePage() {
  const [page, setPage] = useState(1);

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
        <button
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
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
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Loading Overlay */}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No schedules found
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Create your first schedule to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">
                        ID
                      </th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">
                        Start Date
                      </th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">
                        Created At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((schedule) => (
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
                          {new Date(schedule.startDate).toLocaleDateString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(schedule.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </td>
                      </tr>
                    ))}
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
    </div>
  );
}
