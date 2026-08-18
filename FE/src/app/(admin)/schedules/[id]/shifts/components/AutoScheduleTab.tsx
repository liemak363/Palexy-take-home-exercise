"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";
import { useApi } from "@/hooks/useApi";
import {
  scheduleApi,
  AutoScheduleDraft,
  ShiftDraft,
  DraftShiftAssignment,
  HourlyTransaction,
} from "@/services/schedule";
import { DayOfWeek } from "@/services/common"
import { Staff } from "@/services/staff";
import {
  AggregatedSummary,
  HourlyNoticesPanel,
  calculateHourlyNotices,
  SummaryShift,
  ORDERED_DAYS,
  DAY_LABELS,
} from "./SharedSummary";

function shiftDuration(start: string, end: string): number {
  return Number(end.split(":")[0]) - Number(start.split(":")[0]);
}

function draftShiftsToSummaryInputs(draftShifts: ShiftDraft[]): SummaryShift[] {
  return draftShifts.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    start: s.start,
    end: s.end,
    staffCount: s.assignments.length,
  }));
}

interface DraftAssignmentRowProps {
  assignment: DraftShiftAssignment;
  allStaff: Staff[];
  assignedStaffIds: Set<number>;
  shiftId: number;
  onRemove: (shiftId: number, staffId: number) => void;
  onChange: (shiftId: number, oldStaffId: number, newStaffId: number, newName: string) => void;
}

function DraftAssignmentRow({
  assignment,
  allStaff,
  assignedStaffIds,
  shiftId,
  onRemove,
  onChange,
}: DraftAssignmentRowProps) {
  const selectableStaff = allStaff.filter(
    (s) => !assignedStaffIds.has(s.id) || s.id === assignment.staffId
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
        {assignment.staffName.charAt(0).toUpperCase()}
      </div>
      <select
        className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        value={assignment.staffId}
        onChange={(e) => {
          const id = Number(e.target.value);
          const staff = allStaff.find((s) => s.id === id);
          if (staff) onChange(shiftId, assignment.staffId, id, staff.name);
        }}
      >
        {selectableStaff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(shiftId, assignment.staffId)}
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

interface DraftReviewPanelProps {
  draft: AutoScheduleDraft;
  allStaff: Staff[];
  onRemoveAssignment: (shiftId: number, staffId: number) => void;
  onChangeAssignment: (shiftId: number, oldStaffId: number, newStaffId: number, newName: string) => void;
  onAddAssignment: (shiftId: number) => void;
}

function DraftReviewPanel({
  draft, allStaff, onRemoveAssignment, onChangeAssignment, onAddAssignment,
}: DraftReviewPanelProps) {
  const byDay: Record<DayOfWeek, ShiftDraft[]> = {} as Record<DayOfWeek, ShiftDraft[]>;
  for (const day of ORDERED_DAYS) byDay[day] = [];
  for (const s of draft.shifts) byDay[s.dayOfWeek].push(s);

  return (
    <div className="space-y-4">
      {ORDERED_DAYS.map((day) => {
        const dayShifts = byDay[day];
        if (dayShifts.length === 0) return null;
        return (
          <div key={day}>
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold mb-3 ${DAY_BADGE_COLORS[day]}`}>
              {DAY_LABELS[day]}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dayShifts.map((shift) => {
                const dur = shiftDuration(shift.start, shift.end);
                const coverage = shift.peakRequiredStaff > 0
                  ? Math.round((shift.assignments.length / shift.peakRequiredStaff) * 100)
                  : 100;
                const isCovered = shift.assignments.length >= shift.peakRequiredStaff;
                const assignedStaffIds = new Set(shift.assignments.map((a) => a.staffId));
                const isAllStaffAssigned = assignedStaffIds.size >= allStaff.length;

                return (
                  <div
                    key={shift.shiftId}
                    className={`rounded-xl border p-4 ${DAY_SHIFT_COLORS[day]}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {shift.start}–{shift.end}
                          <span className="ml-1.5 text-[10px] font-medium text-gray-400">({dur}h)</span>
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${isCovered ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                            {shift.assignments.length}/{shift.peakRequiredStaff} staff
                          </span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-full rounded-full transition-all ${isCovered ? "bg-emerald-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(coverage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {shift.assignments.map((a) => (
                        <DraftAssignmentRow
                          key={a.staffId}
                          assignment={a}
                          allStaff={allStaff}
                          assignedStaffIds={assignedStaffIds}
                          shiftId={shift.shiftId}
                          onRemove={onRemoveAssignment}
                          onChange={onChangeAssignment}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddAssignment(shift.shiftId)}
                      disabled={isAllStaffAssigned}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-400 transition hover:border-brand-400 hover:text-brand-600 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-600 dark:text-gray-500 dark:hover:border-brand-600 dark:hover:text-brand-400"
                      title={isAllStaffAssigned ? "All available staff are already assigned to this shift" : undefined}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isAllStaffAssigned ? "All Staff Assigned" : "Add Staff"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AutoScheduleTabProps {
  scheduleId: number;
  allStaff: Staff[];
  txnDays: Record<DayOfWeek, HourlyTransaction[]>;
  onScheduleConfirmed: () => Promise<void>;
}

export function AutoScheduleTab({
  scheduleId,
  allStaff,
  txnDays,
  onScheduleConfirmed,
}: AutoScheduleTabProps) {
  const [draft, setDraft] = useState<AutoScheduleDraft | null>(null);

  const { loading: generating, execute: generateDraft } = useApi(
    (id: number) => scheduleApi.autoSchedule(id),
    null as unknown as AutoScheduleDraft
  );

  const { loading: confirming, execute: confirmDraft } = useApi(
    (id: number, body: import("@/services/schedule").ConfirmScheduleReq) =>
      scheduleApi.confirmSchedule(id, body),
    null as unknown as { message: string }
  );

  const handleGenerateDraft = async () => {
    try {
      const result = await generateDraft(scheduleId);
      setDraft(result);
      toast.success("Draft generated successfully.");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to generate auto-schedule.");
    }
  };

  const handleRemoveAssignment = (shiftId: number, staffId: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shifts: prev.shifts.map((s) =>
          s.shiftId === shiftId
            ? { ...s, assignments: s.assignments.filter((a) => a.staffId !== staffId) }
            : s
        ),
      };
    });
  };

  const handleChangeAssignment = (
    shiftId: number,
    oldStaffId: number,
    newStaffId: number,
    newName: string
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        shifts: prev.shifts.map((s) => {
          if (s.shiftId !== shiftId) return s;
          if (s.assignments.some((a) => a.staffId === newStaffId)) {
            toast.error("Staff member is already assigned to this shift.");
            return s;
          }
          return {
            ...s,
            assignments: s.assignments.map((a) =>
              a.staffId === oldStaffId
                ? { ...a, staffId: newStaffId, staffName: newName }
                : a
            ),
          };
        }),
      };
    });
  };

  const handleAddAssignment = (shiftId: number) => {
    if (allStaff.length === 0) {
      toast.error("No staff available to add.");
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      const shift = prev.shifts.find((s) => s.shiftId === shiftId);
      if (!shift) return prev;
      const assigned = new Set(shift.assignments.map((a) => a.staffId));
      const available = allStaff.find((s) => !assigned.has(s.id));
      if (!available) {
        toast.error("All staff are already assigned to this shift.");
        return prev;
      }
      return {
        ...prev,
        shifts: prev.shifts.map((s) =>
          s.shiftId === shiftId
            ? {
                ...s,
                assignments: [
                  ...s.assignments,
                  { shiftId, staffId: available.id, staffName: available.name },
                ],
              }
            : s
        ),
      };
    });
  };

  const handleConfirm = async () => {
    if (!draft) return;
    const assignments = draft.shifts.flatMap((s) =>
      s.assignments.map((a) => ({
        dayOfWeek: s.dayOfWeek,
        start: s.start,
        end: s.end,
        staffId: a.staffId,
      }))
    );
    try {
      await confirmDraft(scheduleId, { assignments });
      toast.success("Schedule confirmed and saved.");
      setDraft(null);
      await onScheduleConfirmed();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to confirm schedule.");
    }
  };

  const draftSummaryInputs = draft ? draftShiftsToSummaryInputs(draft.shifts) : [];
  const draftNotices = calculateHourlyNotices(txnDays, draftSummaryInputs);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Auto-Schedule</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Automatically allocate staff to configured shifts based on transaction demand.
            Review the draft, adjust assignments, then confirm to save.
          </p>
        </div>
        <button
          id="generate-draft-btn"
          type="button"
          onClick={handleGenerateDraft}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {draft ? "Re-Generate Draft" : "Generate Draft"}
            </>
          )}
        </button>
      </div>

      {draft ? (
        <>
          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 px-6 py-5 dark:border-gray-800">
            {[
              { label: "Staff Hours Available", value: draft.totalStaffHoursAvailable },
              { label: "Staff Hours Used", value: draft.totalStaffHoursUsed },
              {
                label: "Utilization",
                value: draft.totalStaffHoursAvailable > 0
                  ? `${Math.round((draft.totalStaffHoursUsed / draft.totalStaffHoursAvailable) * 100)}%`
                  : "–",
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{m.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white/90">{m.value}</p>
              </div>
            ))}
          </div>

          {draftNotices.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                Capacity Notices ({draftNotices.length})
              </h3>
              <HourlyNoticesPanel notices={draftNotices} />
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              Draft Assignments
              <span className="ml-2 text-xs font-normal text-gray-400">
                — review and adjust before confirming
              </span>
            </h3>
            <DraftReviewPanel
              draft={draft}
              allStaff={allStaff}
              onRemoveAssignment={handleRemoveAssignment}
              onChangeAssignment={handleChangeAssignment}
              onAddAssignment={handleAddAssignment}
            />
          </div>

          <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
              Aggregated Summary — Draft
            </h3>
            <AggregatedSummary
              txnDays={txnDays}
              shiftStaffCounts={draftSummaryInputs}
            />
          </div>

          <div className="flex justify-end border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <button
              id="confirm-schedule-btn"
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirming ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Confirming…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm & Save
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 border-t border-gray-100 py-24 text-center dark:border-gray-800">
          <svg className="h-12 w-12 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No draft generated yet.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Click <strong>Generate Draft</strong> to run the auto-scheduling algorithm.
          </p>
        </div>
      )}
    </>
  );
}
