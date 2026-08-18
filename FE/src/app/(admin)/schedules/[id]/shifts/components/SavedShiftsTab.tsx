"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useApi, useApiNoData } from "@/hooks/useApi";
import {
  scheduleApi,
  ScheduleShifts,
  ShiftSlot,
  ConfirmScheduleReq,
  HourlyTransaction,
} from "@/services/schedule";
import { DayOfWeek } from "@/services/common";
import { Shift } from "@/services/shift";
import { Staff } from "@/services/staff";
import {
  AggregatedSummary,
  HourlyNoticesPanel,
  calculateHourlyNotices,
  SummaryShift,
  ORDERED_DAYS,
  DAY_LABELS,
} from "./SharedSummary";

// ---------------------------------------------------------------------------
// Local editable assignment type
// ---------------------------------------------------------------------------

export interface EditableAssignment {
  /** Unique row key (stable across re-renders, not a DB id) */
  rowKey: string;
  staffId: number;
  staffName: string;
}

export interface EditableShift {
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  /** assignments currently shown in the editor */
  assignments: EditableAssignment[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shiftDuration(start: string, end: string): number {
  return Number(end.split(":")[0]) - Number(start.split(":")[0]);
}

function savedShiftsToEditable(shifts: Shift[], shiftDef: ShiftSlot[]): EditableShift[] {
  const days = ORDERED_DAYS;
  const slots =
    shiftDef && shiftDef.length > 0
      ? shiftDef
      : [
          { start: "07:00", end: "15:00" },
          { start: "15:00", end: "23:00" },
        ];

  if (shifts && shifts.length > 0) {
    return shifts.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      start: s.start,
      end: s.end,
      assignments: (s.assignments ?? []).map((a, idx) => ({
        rowKey: `${s.dayOfWeek}|${s.start}|${s.end}|${a.staffId}|${idx}`,
        staffId: a.staffId,
        staffName: a.staff.name,
      })),
    }));
  }

  const editable: EditableShift[] = [];
  for (const day of days) {
    for (const slot of slots) {
      editable.push({
        dayOfWeek: day,
        start: slot.start,
        end: slot.end,
        assignments: [],
      });
    }
  }
  return editable;
}

function editableToSummaryInputs(editable: EditableShift[]): SummaryShift[] {
  return editable.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    start: s.start,
    end: s.end,
    staffCount: s.assignments.length,
  }));
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const DAY_SHIFT_COLORS: Record<DayOfWeek, string> = {
  MONDAY: "border-brand-200 bg-brand-50/40 dark:border-brand-800/40 dark:bg-brand-900/10",
  TUESDAY: "border-violet-200 bg-violet-50/40 dark:border-violet-800/40 dark:bg-violet-900/10",
  WEDNESDAY: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-900/10",
  THURSDAY: "border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-900/10",
  FRIDAY: "border-rose-200 bg-rose-50/40 dark:border-rose-800/40 dark:bg-rose-900/10",
  SATURDAY: "border-cyan-200 bg-cyan-50/40 dark:border-cyan-800/40 dark:bg-cyan-900/10",
  SUNDAY: "border-pink-200 bg-pink-50/40 dark:border-pink-800/40 dark:bg-pink-900/10",
};

const DAY_BADGE_COLORS: Record<DayOfWeek, string> = {
  MONDAY: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400",
  TUESDAY: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  WEDNESDAY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  THURSDAY: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  FRIDAY: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400",
  SATURDAY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400",
  SUNDAY: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400",
};

// ---------------------------------------------------------------------------
// Assignment row
// ---------------------------------------------------------------------------

interface AssignmentRowProps {
  assignment: EditableAssignment;
  assignedStaffIds: Set<number>;
  allStaff: Staff[];
  onRemove: (rowKey: string) => void;
  onChange: (rowKey: string, newStaffId: number, newStaffName: string) => void;
}

function AssignmentRow({
  assignment,
  assignedStaffIds,
  allStaff,
  onRemove,
  onChange,
}: AssignmentRowProps) {
  const selectableStaff = allStaff.filter(
    (s) => !assignedStaffIds.has(s.id) || s.id === assignment.staffId
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
        {assignment.staffName.charAt(0).toUpperCase()}
      </div>
      <select
        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        value={assignment.staffId}
        onChange={(e) => {
          const id = Number(e.target.value);
          const staff = allStaff.find((s) => s.id === id);
          if (staff) onChange(assignment.rowKey, id, staff.name);
        }}
      >
        {selectableStaff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(assignment.rowKey)}
        className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title="Remove assignment"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shift card
// ---------------------------------------------------------------------------

interface ShiftCardProps {
  shift: EditableShift;
  allStaff: Staff[];
  onRemoveAssignment: (rowKey: string) => void;
  onChangeAssignment: (rowKey: string, newStaffId: number, newStaffName: string) => void;
  onAddAssignment: (dayOfWeek: DayOfWeek, start: string, end: string) => void;
}

function ShiftCard({
  shift,
  allStaff,
  onRemoveAssignment,
  onChangeAssignment,
  onAddAssignment,
}: ShiftCardProps) {
  const dur = shiftDuration(shift.start, shift.end);
  const assignedStaffIds = new Set(shift.assignments.map((a) => a.staffId));
  const isAllStaffAssigned = assignedStaffIds.size >= allStaff.length;

  return (
    <div className={`rounded-xl border p-4 ${DAY_SHIFT_COLORS[shift.dayOfWeek]}`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {shift.start}–{shift.end}
          <span className="ml-1.5 text-[10px] font-medium text-gray-400">({dur}h)</span>
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400">
          {shift.assignments.length} staff assigned
        </p>
      </div>

      {shift.assignments.length > 0 ? (
        <div className="space-y-2">
          {shift.assignments.map((a) => (
            <AssignmentRow
              key={a.rowKey}
              assignment={a}
              assignedStaffIds={assignedStaffIds}
              allStaff={allStaff}
              onRemove={onRemoveAssignment}
              onChange={onChangeAssignment}
            />
          ))}
        </div>
      ) : (
        <p className="mb-2 rounded-lg border border-dashed border-gray-200 py-3 text-center text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
          No staff assigned
        </p>
      )}

      <button
        type="button"
        onClick={() => onAddAssignment(shift.dayOfWeek, shift.start, shift.end)}
        disabled={isAllStaffAssigned}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-400 transition hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-600 dark:text-gray-500 dark:hover:border-brand-600 dark:hover:text-brand-400"
        title={
          isAllStaffAssigned
            ? "All available staff are already assigned to this shift"
            : "Add staff member"
        }
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {isAllStaffAssigned ? "All Staff Assigned" : "Add Staff"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SavedShiftsTabProps {
  scheduleId: number;
  schedule: ScheduleShifts;
  allStaff: Staff[];
  txnDays: Record<DayOfWeek, HourlyTransaction[]>;
  onSaved: () => Promise<void>;
}

export function SavedShiftsTab({
  scheduleId,
  schedule,
  allStaff,
  txnDays,
  onSaved,
}: SavedShiftsTabProps) {
  // Convert saved DB shifts into the editable state
  const [editableShifts, setEditableShifts] = useState<EditableShift[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Re-seed editable state when schedule data refreshes
  useEffect(() => {
    const shiftDef = schedule.shiftDefinition ?? [];
    setEditableShifts(savedShiftsToEditable(schedule.shifts ?? [], shiftDef));
    setIsDirty(false);
  }, [schedule]);

  const { loading: saving, execute: doSave } = useApi(
    (id: number, body: ConfirmScheduleReq) => scheduleApi.confirmSchedule(id, body),
    null as unknown as { message: string }
  );

  const { loading: deleting, execute: doDelete } = useApiNoData(
    (id: number) => scheduleApi.deleteShifts(id)
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRemoveAssignment = (rowKey: string) => {
    setEditableShifts((prev) =>
      prev.map((s) => ({
        ...s,
        assignments: s.assignments.filter((a) => a.rowKey !== rowKey),
      }))
    );
    setIsDirty(true);
  };

  const handleChangeAssignment = (
    rowKey: string,
    newStaffId: number,
    newStaffName: string
  ) => {
    setEditableShifts((prev) =>
      prev.map((s) => {
        const idx = s.assignments.findIndex((a) => a.rowKey === rowKey);
        if (idx === -1) return s;
        // Guard: don't allow duplicating a staff member within the same shift
        if (s.assignments.some((a, i) => i !== idx && a.staffId === newStaffId)) {
          toast.error("Staff member is already assigned to this shift.");
          return s;
        }
        const updated = [...s.assignments];
        updated[idx] = { ...updated[idx], staffId: newStaffId, staffName: newStaffName };
        return { ...s, assignments: updated };
      })
    );
    setIsDirty(true);
  };

  const handleAddAssignment = (dayOfWeek: DayOfWeek, start: string, end: string) => {
    setEditableShifts((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek !== dayOfWeek || s.start !== start || s.end !== end) return s;
        const assigned = new Set(s.assignments.map((a) => a.staffId));
        const available = allStaff.find((st) => !assigned.has(st.id));
        if (!available) {
          toast.error("All staff are already assigned to this shift.");
          return s;
        }
        const rowKey = `${dayOfWeek}|${start}|${end}|${available.id}|${Date.now()}`;
        return {
          ...s,
          assignments: [
            ...s.assignments,
            { rowKey, staffId: available.id, staffName: available.name },
          ],
        };
      })
    );
    setIsDirty(true);
  };

  const handleSave = async () => {
    const assignments = editableShifts.flatMap((s) =>
      s.assignments.map((a) => ({
        dayOfWeek: s.dayOfWeek,
        start: s.start,
        end: s.end,
        staffId: a.staffId,
      }))
    );
    try {
      await doSave(scheduleId, { assignments });
      toast.success("Saved shifts updated successfully.");
      setIsDirty(false);
      await onSaved();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to save shifts.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await doDelete(scheduleId);
      toast.success("All shifts deleted. Showing empty slots from shift definition.");
      setIsDirty(false);
      await onSaved();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to delete shifts.");
    } finally {
      setConfirmingDelete(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const summaryInputs = editableToSummaryInputs(editableShifts);
  const notices = calculateHourlyNotices(txnDays, summaryInputs);

  // Group editable shifts by day
  const byDay: Record<DayOfWeek, EditableShift[]> = {} as Record<DayOfWeek, EditableShift[]>;
  for (const day of ORDERED_DAYS) byDay[day] = [];
  for (const s of editableShifts) byDay[s.dayOfWeek].push(s);

  const hasSavedShifts = (schedule.shifts ?? []).length > 0;
  const totalAssignments = editableShifts.reduce((sum, s) => sum + s.assignments.length, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Saved Shifts
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            View and modify the saved shift assignments for this schedule.
            {isDirty && (
              <span className="ml-1.5 font-medium text-amber-600 dark:text-amber-400">
                — Unsaved changes
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Delete all shifts button */}
          {hasSavedShifts && !confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete All Shifts
            </button>
          )}

          {/* Confirm delete inline prompt */}
          {confirmingDelete && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs dark:border-red-800/40 dark:bg-red-900/20">
              <span className="font-medium text-red-700 dark:text-red-400">Delete all shifts?</span>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="rounded bg-red-600 px-2.5 py-1 text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded px-2 py-1 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 px-6 py-5 dark:border-gray-800 sm:grid-cols-3">
        {[
          { label: "Shifts Defined", value: editableShifts.length },
          { label: "Total Assignments", value: totalAssignments },
          { label: "Avg Staff / Shift", value: editableShifts.length > 0 ? (totalAssignments / editableShifts.length).toFixed(1) : "–" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{m.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Capacity notices */}
      {notices.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Capacity Notices ({notices.length})
          </h3>
          <HourlyNoticesPanel notices={notices} />
        </div>
      )}

      {/* Shift cards */}
      <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
        <div className="space-y-6">
          {ORDERED_DAYS.map((day) => {
            const dayShifts = byDay[day];
            if (!dayShifts || dayShifts.length === 0) return null;
            return (
              <div key={day}>
                <div
                  className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${DAY_BADGE_COLORS[day]}`}
                >
                  {DAY_LABELS[day]}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dayShifts.map((shift) => (
                    <ShiftCard
                      key={`${shift.dayOfWeek}|${shift.start}|${shift.end}`}
                      shift={shift}
                      allStaff={allStaff}
                      onRemoveAssignment={handleRemoveAssignment}
                      onChangeAssignment={handleChangeAssignment}
                      onAddAssignment={handleAddAssignment}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aggregated summary */}
      <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
          Aggregated Summary
        </h3>
        <AggregatedSummary txnDays={txnDays} shiftStaffCounts={summaryInputs} />
      </div>
    </>
  );
}
