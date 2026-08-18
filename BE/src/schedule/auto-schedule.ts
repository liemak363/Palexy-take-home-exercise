/**
 * auto-schedule.ts
 *
 * Pure TypeScript scheduling engine — no NestJS / Prisma dependencies.
 * All functions are side-effect-free and unit-testable.
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

import { DayOfWeek, DayOfWeekEnum } from './types/common.type';
import { UploadedTransactions } from './types/uploaded-transactions.type';

/** A Shift row from the database */
export interface ShiftRow {
  id: number;
  scheduleId: number;
  dayOfWeek: DayOfWeek;
  start: string; // 'HH:mm'
  end: string; // 'HH:mm'
}

/** A staff member from the database */
export interface StaffRow {
  id: number;
  name: string;
  maxHour: number; // maxWeeklyHours
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface DraftShiftAssignment {
  shiftId: number;
  staffId: number;
  staffName: string;
}

export interface ShiftDraft {
  shiftId: number;
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  peakRequiredStaff: number;
  allocatedSlots: number;
  assignments: DraftShiftAssignment[];
}

export interface AutoScheduleDraft {
  shifts: ShiftDraft[];
  totalStaffHoursUsed: number;
  totalStaffHoursAvailable: number;
}

// ---------------------------------------------------------------------------
// Aggregated Summary types (also used by the frontend via the same response)
// ---------------------------------------------------------------------------

export interface SummaryCell {
  transactions: number;
  staffHours: number;
  /** null when staffHours === 0 */
  transactionsPerStaffHour: number | null;
}

export interface AggregatedSummary {
  /** day -> hour -> SummaryCell */
  cells: Record<DayOfWeek, Record<string, SummaryCell>>;
  totalStaffHours: number;
  totalTransactions: number;
  /** totalTransactions / totalStaffHours; null when totalStaffHours === 0 */
  overallTransactionsPerStaffHour: number | null;
  /** arithmetic mean of per-cell values (cells with staffHours > 0 only) */
  averageTransactionsPerStaffHour: number | null;
}

// ---------------------------------------------------------------------------
// Step 1 — hourly staff requirement
// ---------------------------------------------------------------------------

/**
 * Calculate the required number of staff for a single hour slot.
 * Always at least 1 even when transactions === 0.
 */
export function calculateHourlyRequirement(
  transactions: number,
  n: number,
): number {
  return Math.max(1, Math.ceil(transactions / n));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Hours (as 'HH:mm') covered by the shift — each full hour from start up to (not including) end. */
function shiftHours(start: string, end: string): string[] {
  const startH = parseInt(start.split(':')[0], 10);
  const endH = parseInt(end.split(':')[0], 10);
  const hours: string[] = [];
  for (let h = startH; h < endH; h++) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }
  return hours;
}

/** Duration of a shift in hours */
function shiftDuration(start: string, end: string): number {
  return parseInt(end.split(':')[0], 10) - parseInt(start.split(':')[0], 10);
}

// ---------------------------------------------------------------------------
// Step 2 — shift peak requirement + priority
// ---------------------------------------------------------------------------

interface ShiftWithPriority {
  shift: ShiftRow;
  hours: string[];
  duration: number;
  /** transactions per hour (from uploaded data) */
  // sample data: {'08:00': 10, '09:00': 20}
  hourlyTxns: Record<string, number>;
  /** required staff per hour */
  // sample data: {'08:00': 1}
  hourlyRequired: Record<string, number>;
  peakRequiredStaff: number;
  currentStaffSlots: number;
}

function buildShiftWithPriority(
  shift: ShiftRow,
  txnLookup: Record<string, Record<string, number>>,
  n: number,
  currentSlots: number,
): ShiftWithPriority {
  const hours = shiftHours(shift.start, shift.end);
  const duration = shiftDuration(shift.start, shift.end);
  const dayTxns = txnLookup[shift.dayOfWeek] ?? {};

  const hourlyTxns: Record<string, number> = {};
  const hourlyRequired: Record<string, number> = {};

  for (const h of hours) {
    const txns = dayTxns[h] ?? 0;
    hourlyTxns[h] = txns;
    hourlyRequired[h] = calculateHourlyRequirement(txns, n);
  }

  const peakRequiredStaff = Math.max(1, ...Object.values(hourlyRequired));

  return {
    shift,
    hours,
    duration,
    hourlyTxns,
    hourlyRequired,
    peakRequiredStaff,
    currentStaffSlots: currentSlots,
  };
}

/** Lower = higher priority */
function peakCoverageRatio(s: ShiftWithPriority): number {
  return s.currentStaffSlots / s.peakRequiredStaff;
}

/** Higher = higher priority */
function marginalCoverageRatio(s: ShiftWithPriority): number {
  const marginalValue = s.hours.filter(
    (h) => s.hourlyRequired[h] > s.currentStaffSlots,
  ).length;
  return s.duration > 0 ? marginalValue / s.duration : 0;
}

/**
 * Compare two shifts by priority:
 * 1. peakCoverageRatio ASC (lower = more urgent)
 * 2. marginalCoverageRatio DESC (higher = more useful)
 * 3. peakRequiredStaff DESC (larger = more critical)
 */
function compareByPriority(a: ShiftWithPriority, b: ShiftWithPriority): number {
  const pcrA = peakCoverageRatio(a);
  const pcrB = peakCoverageRatio(b);
  if (pcrA !== pcrB) return pcrA - pcrB; // ASC

  const mcrA = marginalCoverageRatio(a);
  const mcrB = marginalCoverageRatio(b);
  if (mcrA !== mcrB) return mcrB - mcrA; // DESC

  return b.peakRequiredStaff - a.peakRequiredStaff; // DESC
}

// ---------------------------------------------------------------------------
// Step 3 — allocate staff-hour capacity to shift slots
// ---------------------------------------------------------------------------

export interface AllocatedShift {
  shift: ShiftRow;
  duration: number;
  peakRequiredStaff: number;
  allocatedSlots: number;
}

/**
 * Iteratively allocate the available staff-hour resource (sum of maxWeeklyHours)
 * to shift slots following the priority rules in the spec.
 *
 * @param shifts       All shifts for the schedule
 * @param txnLookup    day → hour → transactions
 * @param n            Transactions-per-staff-hour target
 * @param totalCapacity Sum of all staff maxWeeklyHours
 */
export function allocateStaffSlots(
  shifts: ShiftRow[],
  txnLookup: Record<string, Record<string, number>>,
  n: number,
  totalCapacity: number,
): AllocatedShift[] {
  // Build mutable priority records, all starting at 0 slots
  const records: ShiftWithPriority[] = shifts.map((shift) =>
    buildShiftWithPriority(shift, txnLookup, n, 0),
  );

  // Map shiftId → slotCount for fast lookup
  const slotMap = new Map<number, number>(shifts.map((s) => [s.id, 0]));

  let remainingCapacity = totalCapacity;

  while (remainingCapacity > 0) {
    // Find shifts that still need more slots
    const eligible = records.filter(
      (r) => r.currentStaffSlots < r.peakRequiredStaff,
    );
    if (eligible.length === 0) break; // all targets met

    // Sort by priority and pick the best
    eligible.sort(compareByPriority);
    const best = eligible[0];

    if (remainingCapacity < best.duration) break; // can't afford even one more slot

    // Add one slot
    best.currentStaffSlots += 1;
    slotMap.set(best.shift.id, best.currentStaffSlots);
    remainingCapacity -= best.duration;
  }

  return records.map((r) => ({
    shift: r.shift,
    duration: r.duration,
    peakRequiredStaff: r.peakRequiredStaff,
    allocatedSlots: r.currentStaffSlots,
  }));
}

// ---------------------------------------------------------------------------
// Step 4 — assign actual staff to allocated shift slots
// ---------------------------------------------------------------------------

/**
 * Assign staff to the pre-allocated shift slots.
 * Sorted ascending by allocatedSlots; uses lowest-utilization eligible staff first.
 *
 * @param allocatedShifts Result of allocateStaffSlots
 * @param staff           All active staff
 */
export function assignStaffToShifts(
  allocatedShifts: AllocatedShift[],
  staff: StaffRow[],
): { draftShifts: ShiftDraft[] } {
  // Track assigned hours per staff member
  const assignedHours = new Map<number, number>(staff.map((s) => [s.id, 0]));

  // sort by the order of shift in week
  const shiftOrderInWeek = (a: AllocatedShift, b: AllocatedShift) => {
    const dayOrder = {
      [DayOfWeekEnum.MONDAY]: 0,
      [DayOfWeekEnum.TUESDAY]: 1,
      [DayOfWeekEnum.WEDNESDAY]: 2,
      [DayOfWeekEnum.THURSDAY]: 3,
      [DayOfWeekEnum.FRIDAY]: 4,
      [DayOfWeekEnum.SATURDAY]: 5,
      [DayOfWeekEnum.SUNDAY]: 6,
    };
    if (dayOrder[a.shift.dayOfWeek] !== dayOrder[b.shift.dayOfWeek]) {
      return dayOrder[a.shift.dayOfWeek] - dayOrder[b.shift.dayOfWeek];
    }

    return a.shift.start < b.shift.start ? -1 : 1;
  };
  const sorted = [...allocatedShifts].sort(shiftOrderInWeek);

  const draftShifts: ShiftDraft[] = [];

  for (const allocated of sorted) {
    const assignments: DraftShiftAssignment[] = [];
    const dur = allocated.duration;
    const assignedStaffIdsInShift = new Set<number>();

    for (let slot = 0; slot < allocated.allocatedSlots; slot++) {
      // Eligible: not already assigned to this shift and not over weekly cap
      const eligibleStaff = staff
        .filter(
          (s) =>
            !assignedStaffIdsInShift.has(s.id) &&
            (assignedHours.get(s.id) ?? 0) + dur <= s.maxHour,
        )
        .sort((a, b) => {
          // Lowest utilization first
          const utilA = (assignedHours.get(a.id) ?? 0) / a.maxHour;
          const utilB = (assignedHours.get(b.id) ?? 0) / b.maxHour;
          return utilA - utilB;
        });

      if (eligibleStaff.length === 0) {
        break;
      }

      const chosen = eligibleStaff[0];
      assignedStaffIdsInShift.add(chosen.id);
      assignedHours.set(chosen.id, (assignedHours.get(chosen.id) ?? 0) + dur);
      assignments.push({
        shiftId: allocated.shift.id,
        staffId: chosen.id,
        staffName: chosen.name,
      });
    }

    draftShifts.push({
      shiftId: allocated.shift.id,
      dayOfWeek: allocated.shift.dayOfWeek,
      start: allocated.shift.start,
      end: allocated.shift.end,
      peakRequiredStaff: allocated.peakRequiredStaff,
      allocatedSlots: allocated.allocatedSlots,
      assignments,
    });
  }

  // Restore original order (by shiftId for stable display)
  draftShifts.sort((a, b) => a.shiftId - b.shiftId);

  return { draftShifts };
}

// ---------------------------------------------------------------------------
// Aggregated summary calculation
// ---------------------------------------------------------------------------

/**
 * Compute the aggregated summary table.
 *
 * @param txns    Uploaded transaction data
 * @param shifts  Shift rows (either draft or saved), each with their staff count
 */
export function calculateAggregatedSummary(
  txns: UploadedTransactions,
  shiftStaffCounts: {
    dayOfWeek: DayOfWeek;
    start: string;
    end: string;
    staffCount: number;
  }[],
): AggregatedSummary {
  const ALL_DAYS: DayOfWeek[] = Object.values(DayOfWeekEnum);

  // Build txn lookup
  const txnLookup: Record<string, Record<string, number>> = {};
  for (const day of ALL_DAYS) {
    txnLookup[day] = {};
    for (const entry of txns.days[day] ?? []) {
      txnLookup[day][entry.hour] = entry.transactions;
    }
  }

  // Build staffHours lookup: day → hour → count
  const staffLookup: Record<string, Record<string, number>> = {};
  for (const day of ALL_DAYS) {
    staffLookup[day] = {};
  }
  for (const s of shiftStaffCounts) {
    const hours = shiftHours(s.start, s.end);
    for (const h of hours) {
      staffLookup[s.dayOfWeek][h] =
        (staffLookup[s.dayOfWeek][h] ?? 0) + s.staffCount;
    }
  }

  // Collect all unique hours across all days
  const allHours = new Set<string>();
  for (const day of ALL_DAYS) {
    for (const h of Object.keys(txnLookup[day])) allHours.add(h);
    for (const h of Object.keys(staffLookup[day])) allHours.add(h);
  }

  const cells: Record<DayOfWeek, Record<string, SummaryCell>> = {} as Record<
    DayOfWeek,
    Record<string, SummaryCell>
  >;

  let totalStaffHours = 0;
  let totalTransactions = 0;
  const cellValues: number[] = [];

  for (const day of ALL_DAYS) {
    cells[day] = {};
    for (const h of allHours) {
      const transactions = txnLookup[day][h] ?? 0;
      const staffHours = staffLookup[day][h] ?? 0;
      const txnPerStaff = staffHours > 0 ? transactions / staffHours : null;

      cells[day][h] = {
        transactions,
        staffHours,
        transactionsPerStaffHour: txnPerStaff,
      };
      totalStaffHours += staffHours;
      totalTransactions += transactions;
      if (txnPerStaff !== null) cellValues.push(txnPerStaff);
    }
  }

  const overallTransactionsPerStaffHour =
    totalStaffHours > 0 ? totalTransactions / totalStaffHours : null;

  const averageTransactionsPerStaffHour =
    cellValues.length > 0
      ? cellValues.reduce((a, b) => a + b, 0) / cellValues.length
      : null;

  return {
    cells,
    totalStaffHours,
    totalTransactions,
    overallTransactionsPerStaffHour,
    averageTransactionsPerStaffHour,
  };
}

// ---------------------------------------------------------------------------
// Top-level entry point
// ---------------------------------------------------------------------------

/**
 * Run the full auto-schedule algorithm.
 *
 * @param txns   Uploaded transaction data for the schedule
 * @param shifts Configured shift rows for the schedule
 * @param staff  All active staff (global pool)
 * @param n      Transactions-per-staff-hour target (default 15)
 */
export function runAutoSchedule(
  txns: UploadedTransactions,
  shifts: ShiftRow[],
  staff: StaffRow[],
  n: number = 15,
): AutoScheduleDraft {
  if (shifts.length === 0) {
    return {
      shifts: [],
      totalStaffHoursUsed: 0,
      totalStaffHoursAvailable: staff.reduce((s, m) => s + m.maxHour, 0),
    };
  }

  // Build txn lookup
  const txnLookup: Record<string, Record<string, number>> = {};
  for (const day of Object.keys(txns.days)) {
    txnLookup[day] = {};
    for (const entry of txns.days[day as DayOfWeek]) {
      txnLookup[day][entry.hour] = entry.transactions;
    }
  }

  const totalStaffHoursAvailable = staff.reduce((sum, s) => sum + s.maxHour, 0);

  // Step 3 — allocate slots
  const allocated = allocateStaffSlots(
    shifts,
    txnLookup,
    n,
    totalStaffHoursAvailable,
  );

  // Step 4 — assign staff
  const { draftShifts } = assignStaffToShifts(allocated, staff);

  const totalStaffHoursUsed = draftShifts.reduce(
    (sum, s) => sum + s.assignments.length * shiftDuration(s.start, s.end),
    0,
  );

  return {
    shifts: draftShifts,
    totalStaffHoursUsed,
    totalStaffHoursAvailable,
  };
}
