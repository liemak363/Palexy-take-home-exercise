"use client";

import React, { createContext, useCallback, useContext } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useApiEffect } from "@/hooks/useApi";
import { scheduleApi, Schedule } from "@/services/schedule";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ScheduleContextValue {
  schedule: Schedule | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const ScheduleContext = createContext<ScheduleContextValue>({
  schedule: null,
  loading: false,
  error: null,
  refetch: () => {},
});

export function useScheduleContext() {
  return useContext(ScheduleContext);
}

// ---------------------------------------------------------------------------
// Provider (used only by the layout)
// ---------------------------------------------------------------------------

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const scheduleId = Number(params.id);

  const fetchSchedule = useCallback(
    (id: number) => scheduleApi.getById(id),
    []
  );

  const {
    data: schedule,
    loading,
    error,
    refetch,
  } = useApiEffect(
    fetchSchedule,
    null as unknown as Schedule,
    [scheduleId] as [number],
    (err) => {
      toast.error(
        (err as { message?: string })?.message ?? "Failed to load schedule."
      );
    },
    [scheduleId]
  );

  return (
    <ScheduleContext.Provider value={{ schedule, loading, error, refetch }}>
      {children}
    </ScheduleContext.Provider>
  );
}
