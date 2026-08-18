"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { formatDate } from "@/utils/formatDate";
import DetailNavBar, { NavTab } from "@/layout/DetailNavBar";
import { GridIcon, TimeIcon } from "@/icons";
import { ScheduleProvider, useScheduleContext } from "./ScheduleContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weekEndDate(mondayIso: string): string {
  const [y, m, d] = mondayIso.split("T")[0].split("-").map(Number);
  const sunday = new Date(Date.UTC(y, m - 1, d + 6));
  return [
    sunday.getUTCFullYear(),
    String(sunday.getUTCMonth() + 1).padStart(2, "0"),
    String(sunday.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

// ---------------------------------------------------------------------------
// Inner layout — consumes context (must be a child of ScheduleProvider)
// ---------------------------------------------------------------------------

function LayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const scheduleId = Number(params.id);
  const router = useRouter();
  const { schedule, loading } = useScheduleContext();

  const tabs: NavTab[] = [
    {
      label: "Overview",
      href: `/schedules/${scheduleId}`,
      icon: <GridIcon />,
    },
    {
      label: "Shifts",
      href: `/schedules/${scheduleId}/shifts`,
      icon: <TimeIcon />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <button
          onClick={() => router.push("/schedules")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {loading || !schedule
              ? `Schedule #${scheduleId}`
              : `Schedule #${schedule.id}`}
          </h1>
          {!loading && schedule && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {formatDate(schedule.startDate, "UTC")} –{" "}
              {formatDate(weekEndDate(schedule.startDate), "UTC")}
            </p>
          )}
        </div>
      </div>

      {/* Flat Horizontal Nav Bar */}
      <DetailNavBar tabs={tabs} />

      {/* Tab content card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported layout — wraps everything in the shared ScheduleProvider
// ---------------------------------------------------------------------------

export default function ScheduleDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ScheduleProvider>
      <LayoutInner>{children}</LayoutInner>
    </ScheduleProvider>
  );
}
