"use client";

import React, { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useApiEffect } from "@/hooks/useApi";
import {
  scheduleApi,
  ScheduleShifts,
  HourlyTransaction,
} from "@/services/schedule";
import { DayOfWeek } from "@/services/common";
import { staffApi, Staff } from "@/services/staff";
import { useScheduleContext } from "../ScheduleContext";
import { ShiftDefinitionTab } from "./components/ShiftDefinitionTab";
import { AutoScheduleTab } from "./components/AutoScheduleTab";
import { SavedShiftsTab } from "./components/SavedShiftsTab";

type Tab = "saved" | "definition" | "auto-schedule";

const TAB_LABELS: Record<Tab, string> = {
  saved: "Saved Shifts",
  definition: "Shift Definition",
  "auto-schedule": "Auto-Schedule",
};

export default function ShiftsPage() {
  const params = useParams<{ id: string }>();
  const scheduleId = Number(params.id);

  const { schedule: scheduleOverview } = useScheduleContext();
  const txnDays: Record<DayOfWeek, HourlyTransaction[]> =
    (scheduleOverview?.uploadedTxns?.days as Record<DayOfWeek, HourlyTransaction[]>) ??
    (Object.fromEntries(
      (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as DayOfWeek[]).map(
        (d) => [d, [] as HourlyTransaction[]]
      )
    ) as unknown as Record<DayOfWeek, HourlyTransaction[]>);

  const [activeTab, setActiveTab] = useState<Tab>("saved");

  const fetchScheduleShifts = useCallback(
    (id: number) => scheduleApi.getScheduleShifts(id),
    []
  );

  const {
    data: schedule,
    loading: fetchLoading,
    error: fetchError,
    refetch: refetchShifts,
  } = useApiEffect(
    fetchScheduleShifts,
    null as unknown as ScheduleShifts,
    [scheduleId] as [number],
    (err) => {
      toast.error((err as { message?: string })?.message ?? "Failed to load shifts.");
    },
    [scheduleId]
  );

  const fetchAllStaff = useCallback(() => staffApi.getAll(1, 500), []);
  const { data: staffResult } = useApiEffect(
    fetchAllStaff,
    null as unknown as import("@/services/staff").StaffListResult,
    [],
    undefined,
    []
  );
  const allStaff: Staff[] = staffResult?.items ?? [];

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (fetchError || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {fetchError ?? "Schedule not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Tab switcher */}
      <div className="flex gap-1 overflow-x-auto px-6 pt-5 pb-0">
        {(["saved", "definition", "auto-schedule"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "border border-b-0 border-gray-200 bg-white text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-brand-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Saved Shifts */}
      {activeTab === "saved" && (
        <SavedShiftsTab
          scheduleId={scheduleId}
          schedule={schedule}
          allStaff={allStaff}
          txnDays={txnDays}
          onSaved={async () => {
            await refetchShifts();
          }}
        />
      )}

      {/* Tab: Shift Definition */}
      {activeTab === "definition" && (
        <ShiftDefinitionTab
          scheduleId={scheduleId}
          schedule={schedule}
          onDefinitionChanged={ async () => {
            await refetchShifts();
          }
          }
        />
      )}

      {/* Tab: Auto-Schedule */}
      {activeTab === "auto-schedule" && (
        <AutoScheduleTab
          scheduleId={scheduleId}
          allStaff={allStaff}
          txnDays={txnDays}
          onScheduleConfirmed={async () => {
            await refetchShifts();
          }}
        />
      )}
    </div>
  );
}
