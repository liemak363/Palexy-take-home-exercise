"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useApi } from "@/hooks/useApi";
import {
  scheduleApi,
  ScheduleShifts,
  ShiftSlot,
  ShiftDefinition,
  HourlyTransaction,
} from "@/services/schedule";
import { DayOfWeek } from "@/services/common"
import { Shift } from "@/services/shift";
import {
  AggregatedSummary,
  HourlyNoticesPanel,
  calculateHourlyNotices,
  SummaryShift,
} from "./SharedSummary";

const DAY_START = "07";
const DAY_END = "23";

const HOURS: string[] = Array.from(
  { length: Number(DAY_END) - Number(DAY_START) + 1 },
  (_, i) => String(Number(DAY_START) + i).padStart(2, "0")
);

function slotDuration(slot: ShiftSlot): number {
  return Number(slot.end.split(":")[0]) - Number(slot.start.split(":")[0]);
}

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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
        {index + 1}
      </span>

      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Start</label>
        <select
          value={slot.start.split(":")[0]}
          onChange={(e) => onStartChange(index, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-brand-600 dark:focus:ring-brand-800"
        >
          {HOURS.filter((h) => h < DAY_END).map((h) => (
            <option key={h} value={h}>{h}:00</option>
          ))}
        </select>
      </div>

      <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>

      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">End</label>
        <select
          value={slot.end.split(":")[0]}
          onChange={(e) => onEndChange(index, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-brand-600 dark:focus:ring-brand-800"
        >
          {HOURS.filter((h) => h > DAY_START && h <= DAY_END).map((h) => (
            <option key={h} value={h}>{h}:00</option>
          ))}
        </select>
      </div>

      <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {duration}h
      </span>

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

const TIMELINE_COLORS = [
  "bg-brand-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
];

function Timeline({ slots }: { slots: ShiftSlot[] }) {
  const totalHours = Number(DAY_END) - Number(DAY_START);
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
      <div className="flex justify-between px-0.5 text-[10px] text-gray-400 dark:text-gray-500">
        {["07:00", "11:00", "15:00", "19:00", "23:00"].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </div>
  );
}

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

function savedShiftsToSummaryInputs(shifts: Shift[]): SummaryShift[] {
  return shifts.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    start: s.start,
    end: s.end,
    staffCount: s.assignments.length,
  }));
}

interface ShiftDefinitionTabProps {
  scheduleId: number;
  schedule: ScheduleShifts;
  txnDays: Record<DayOfWeek, HourlyTransaction[]>;
}

export function ShiftDefinitionTab({
  scheduleId,
  schedule,
  txnDays,
}: ShiftDefinitionTabProps) {
  const [slots, setSlots] = useState<ShiftSlot[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!schedule) return;
    if (schedule.shiftDefinition && schedule.shiftDefinition.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots(schedule.shiftDefinition);
    } else {
      setSlots([
        { start: "07:00", end: "15:00" },
        { start: "15:00", end: "23:00" },
      ]);
    }
  }, [schedule?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { loading: saving, execute: save } = useApi(
    (id: number, shifts: ShiftSlot[]) => scheduleApi.updateShiftDefinition(id, shifts),
    null as unknown as ShiftDefinition
  );

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
      const last = prev[prev.length - 1];
      if (!last) return [{ start: `${DAY_START}:00`, end: `${DAY_END}:00` }];
      const lastStartH = Number(last.start.split(":")[0]);
      const lastEndH = Number(last.end.split(":")[0]);
      const mid = lastStartH + Math.floor((lastEndH - lastStartH) / 2);
      if (mid <= lastStartH || mid >= lastEndH) {
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
      const message = (err as { message?: string })?.message ?? "Failed to save shifts.";
      setClientError(message);
    }
  };

  const clientValidation = validateSlots(slots);
  const isValid = clientValidation === null;
  const savedShiftSummaryInputs = savedShiftsToSummaryInputs(schedule.shifts ?? []);
  const savedNotices = calculateHourlyNotices(txnDays, savedShiftSummaryInputs);

  return (
    <>
      <div className="px-6 py-5">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Shift Definition
        </h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Define shifts that cover the full operating day from{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">07:00</span> to{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">23:00</span> with no
          gaps or overlaps.
        </p>
      </div>

      <div className="px-6 py-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Timeline Preview
        </p>
        <Timeline slots={[...slots].sort((a, b) => a.start.localeCompare(b.start))} />
      </div>

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

      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex-1">
          {!isValid && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{clientValidation}</span>
            </div>
          )}
          {isValid && clientError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{clientError}</span>
            </div>
          )}
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

      {(schedule.shifts ?? []).length > 0 && (
        <div className="space-y-4 px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            Aggregated Summary & Capacity Notices — Saved Assignments
          </h3>
          <HourlyNoticesPanel notices={savedNotices} />
          <AggregatedSummary
            txnDays={txnDays}
            shiftStaffCounts={savedShiftSummaryInputs}
          />
        </div>
      )}
    </>
  );
}
