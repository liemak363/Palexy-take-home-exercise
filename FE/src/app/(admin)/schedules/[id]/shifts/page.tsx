"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { useApi, useApiEffect } from "@/hooks/useApi";
import { scheduleApi, ScheduleShifts, ShiftSlot, ShiftDefinition } from "@/services/schedule";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_START = "07";
const DAY_END = "23";

/** All valid whole hours in the 07:00–23:00 range. */
const HOURS: string[] = Array.from(
  { length: Number(DAY_END) - Number(DAY_START) + 1 },
  (_, i) => String(Number(DAY_START) + i).padStart(2, "0")
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Duration in hours for a slot */
function slotDuration(slot: ShiftSlot): number {
  return Number(slot.end.split(":")[0]) - Number(slot.start.split(":")[0]);
}

// ---------------------------------------------------------------------------
// ShiftRow — a single editable shift slot
// ---------------------------------------------------------------------------

interface ShiftRowProps {
  slot: ShiftSlot;
  index: number;
  total: number;
  onStartChange: (index: number, value: string) => void;
  onEndChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function ShiftRow({ slot, index, total, onStartChange, onEndChange, onRemove }: ShiftRowProps) {
  const duration = slotDuration(slot);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-brand-700 dark:hover:bg-brand-900/10">
      {/* Shift number badge */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
        {index + 1}
      </span>

      {/* Start time */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Start
        </label>
        <select
          value={slot.start.split(":")[0]}
          onChange={(e) => onStartChange(index, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-brand-600 dark:focus:ring-brand-800"
        >
          {HOURS.filter((h) => h < DAY_END).map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
      </div>

      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>

      {/* End time */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          End
        </label>
        <select
          value={slot.end.split(":")[0]}
          onChange={(e) => onEndChange(index, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-brand-600 dark:focus:ring-brand-800"
        >
          {HOURS.filter((h) => h > DAY_START && h <= DAY_END).map((h) => (
            <option key={h} value={h}>
              {h}:00
            </option>
          ))}
        </select>
      </div>

      {/* Duration pill */}
      <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {duration}h
      </span>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={total <= 1}
        className="ml-auto rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title="Remove shift"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline visualizer
// ---------------------------------------------------------------------------

const TIMELINE_COLORS = [
  "bg-brand-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

interface TimelineProps {
  slots: ShiftSlot[];
}

function Timeline({ slots }: TimelineProps) {
  const totalHours = Number(DAY_END) - Number(DAY_START); // 16

  return (
    <div className="space-y-2">
      <div className="relative h-10 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {slots.map((slot, i) => {
          const startH = Number(slot.start.split(":")[0]) - Number(DAY_START);
          const endH = Number(slot.end.split(":")[0]) - Number(DAY_START);
          const left = (startH / totalHours) * 100;
          const width = ((endH - startH) / totalHours) * 100;
          const color = TIMELINE_COLORS[i % TIMELINE_COLORS.length];

          return (
            <div
              key={i}
              className={`absolute inset-y-0 ${color} flex items-center justify-center overflow-hidden transition-all duration-300`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="truncate px-1 text-[10px] font-bold text-white">
                {slot.start}–{slot.end}
              </span>
            </div>
          );
        })}
      </div>
      {/* Hour markers */}
      <div className="flex justify-between px-0.5 text-[10px] text-gray-400 dark:text-gray-500">
        {["07:00", "11:00", "15:00", "19:00", "23:00"].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation (client-side, mirrors backend)
// ---------------------------------------------------------------------------

function validateSlots(slots: ShiftSlot[]): string | null {
  if (slots.length === 0) return "At least one shift is required.";

  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  for (const s of sorted) {
    if (s.start >= s.end) return `Shift start must be before end: ${s.start}–${s.end}.`;
  }

  if (sorted[0].start !== `${DAY_START}:00`) return `Shifts must start at ${DAY_START}:00.`;
  if (sorted[sorted.length - 1].end !== `${DAY_END}:00`) return `Shifts must end at ${DAY_END}:00.`;

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = sorted[i - 1].end;
    const curStart = sorted[i].start;
    if (prevEnd < curStart) return `Gap between shifts: ${prevEnd}–${curStart}.`;
    if (prevEnd > curStart) return `Overlapping shifts: ${prevEnd} > ${curStart}.`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ShiftsPage() {
  const params = useParams<{ id: string }>();
  const scheduleId = Number(params.id);

  // Fetch shift definition + assigned shifts (no uploadedTxns overhead)
  const fetchScheduleShifts = useCallback(
    (id: number) => scheduleApi.getScheduleShifts(id),
    []
  );

  const {
    data: schedule,
    loading: fetchLoading,
    error: fetchError,
  } = useApiEffect(
    fetchScheduleShifts,
    null as unknown as ScheduleShifts,
    [scheduleId] as [number],
    (err) => {
      toast.error(
        (err as { message?: string })?.message ?? "Failed to load shifts."
      );
    },
    [scheduleId]
  );

  // Local editable slots state
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  // Seed local slots once per schedule load.
  // We depend on `schedule?.id` (a stable primitive) rather than the full
  // `schedule` object, which is a new reference on every render and would
  // cause an infinite setState → re-render loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!schedule) return;
    if (schedule.shiftDefinition && schedule.shiftDefinition.length > 0) {
      setSlots(schedule.shiftDefinition);
    } else {
      // Default: two equal shifts covering the day
      setSlots([
        { start: "07:00", end: "15:00" },
        { start: "15:00", end: "23:00" },
      ]);
    }
  }, [schedule?.id]); // intentional: re-seed only when a different schedule is loaded

  // Save API
  const {
    loading: saving,
    execute: save,
  } = useApi(
    (id: number, shifts: ShiftSlot[]) =>
      scheduleApi.updateShiftDefinition(id, shifts),
    null as unknown as ShiftDefinition
  );

  // ---------------------------------------------------------------------------
  // Slot editing helpers
  // ---------------------------------------------------------------------------

  const handleStartChange = (index: number, hourStr: string) => {
    setClientError(null);
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], start: `${hourStr}:00` };
      return next;
    });
  };

  const handleEndChange = (index: number, hourStr: string) => {
    setClientError(null);
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], end: `${hourStr}:00` };
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setClientError(null);
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddShift = () => {
    setClientError(null);
    setSlots((prev) => {
      // Try to split the last slot in half
      const last = prev[prev.length - 1];
      if (!last) {
        return [{ start: `${DAY_START}:00`, end: `${DAY_END}:00` }];
      }
      const lastStartH = Number(last.start.split(":")[0]);
      const lastEndH = Number(last.end.split(":")[0]);
      const mid = lastStartH + Math.floor((lastEndH - lastStartH) / 2);
      if (mid <= lastStartH || mid >= lastEndH) {
        // Can't split further
        toast.error("Cannot add another shift — there is no remaining time to split.");
        return prev;
      }
      const midStr = `${String(mid).padStart(2, "0")}:00`;
      return [
        ...prev.slice(0, -1),
        { start: last.start, end: midStr },
        { start: midStr, end: last.end },
      ];
    });
  };

  const handleSave = async () => {
    const err = validateSlots(slots);
    if (err) {
      setClientError(err);
      return;
    }
    setClientError(null);
    try {
      await save(scheduleId, slots);
      toast.success("Shift definition saved.");
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to save shifts.";
      setClientError(message);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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

  const clientValidation = validateSlots(slots);
  const isValid = clientValidation === null;

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {/* Header */}
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Shift Definition
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Define shifts that cover the full operating day from{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">07:00</span> to{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">23:00</span> with
          no gaps or overlaps.
        </p>
      </div>

      {/* Timeline */}
      <div className="px-6 py-4">
        <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide dark:text-gray-500">
          Timeline Preview
        </p>
        <Timeline slots={[...slots].sort((a, b) => a.start.localeCompare(b.start))} />
      </div>

      {/* Shift rows */}
      <div className="space-y-3 px-6 py-5">
        {slots.map((slot, i) => (
          <ShiftRow
            key={i}
            slot={slot}
            index={i}
            total={slots.length}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            onRemove={handleRemove}
          />
        ))}

        {/* Add shift button */}
        <button
          type="button"
          onClick={handleAddShift}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-500 dark:hover:border-brand-700 dark:hover:text-brand-400"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Shift
        </button>
      </div>

      {/* Validation status + save */}
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex-1">
          {/* Real-time client validation hint */}
          {!isValid && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{clientValidation}</span>
            </div>
          )}
          {/* Backend / save error */}
          {isValid && clientError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{clientError}</span>
            </div>
          )}
          {/* Coverage summary when valid */}
          {isValid && !clientError && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {slots.length} shift{slots.length !== 1 ? "s" : ""} covering 07:00–23:00 (16 hours)
            </p>
          )}
        </div>

        <button
          id="save-shifts-btn"
          type="button"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {saving ? "Saving…" : "Save Shifts"}
        </button>
      </div>
    </div>
  );
}
