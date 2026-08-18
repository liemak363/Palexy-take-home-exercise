import {
  calculateHourlyRequirement,
  allocateStaffSlots,
  assignStaffToShifts,
  runAutoSchedule,
  calculateAggregatedSummary,
  ShiftRow,
  StaffRow,
} from './auto-schedule';
import { UploadedTransactions } from './types/uploaded-transactions.type';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeShift(
  id: number,
  dayOfWeek: ShiftRow['dayOfWeek'],
  start: string,
  end: string,
): ShiftRow {
  return { id, scheduleId: 1, dayOfWeek, start, end };
}

function makeStaff(id: number, name: string, maxHour: number): StaffRow {
  return { id, name, maxHour };
}

function makeTxns(
  day: 'MONDAY',
  entries: { hour: string; transactions: number }[],
): UploadedTransactions {
  return {
    version: 1,
    days: {
      MONDAY: entries,
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Hourly staff requirement
// ---------------------------------------------------------------------------

describe('calculateHourlyRequirement', () => {
  const N = 15;

  it('returns 1 when transactions === 0 (open hour always needs ≥1 staff)', () => {
    expect(calculateHourlyRequirement(0, N)).toBe(1);
  });

  it('returns 1 when transactions === N (exactly one staff)', () => {
    expect(calculateHourlyRequirement(15, N)).toBe(1);
  });

  it('returns 2 when transactions === N + 1 (ceil)', () => {
    expect(calculateHourlyRequirement(16, N)).toBe(2);
  });

  it('returns 2 when transactions === 2*N', () => {
    expect(calculateHourlyRequirement(30, N)).toBe(2);
  });

  it('returns 3 when transactions === 2*N + 1', () => {
    expect(calculateHourlyRequirement(31, N)).toBe(3);
  });

  it('returns 1 for very small transaction counts', () => {
    expect(calculateHourlyRequirement(1, N)).toBe(1);
    expect(calculateHourlyRequirement(7, N)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Shift peak requirement — zero-transaction hours
// ---------------------------------------------------------------------------

describe('allocateStaffSlots — shift peak requirement', () => {
  const N = 15;
  const staff = [makeStaff(1, 'Alice', 40), makeStaff(2, 'Bob', 40)];
  const totalCap = staff.reduce((s, x) => s + x.maxHour, 0); // 80

  it('zero-transaction shift still gets peakRequiredStaff >= 1', () => {
    const shift = makeShift(1, 'MONDAY', '07:00', '15:00');
    // No transactions at all → all hours have 0 → ceil(0/15)=0 → max(1,0)=1
    const txnLookup = { MONDAY: {} };
    const allocated = allocateStaffSlots([shift], txnLookup, N, totalCap);
    expect(allocated[0].peakRequiredStaff).toBe(1);
  });

  it('peak is the max across all covered hours', () => {
    const shift = makeShift(1, 'MONDAY', '07:00', '10:00');
    const txnLookup = {
      MONDAY: {
        '07:00': 10, // req=1
        '08:00': 30, // req=2
        '09:00': 46, // req=4
      },
    };
    const allocated = allocateStaffSlots([shift], txnLookup, N, totalCap);
    expect(allocated[0].peakRequiredStaff).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 3. Priority calculation
// ---------------------------------------------------------------------------

describe('allocateStaffSlots — priority ordering', () => {
  const N = 15;

  it('allocates to the shift with lowest peakCoverageRatio first', () => {
    // Shift A: 2h, peak=4 (needs 4 slots)
    // Shift B: 2h, peak=2 (needs 2 slots)
    // Both start at 0 slots → A has lower coverage ratio (0/4) vs B (0/2) — SAME ratio 0
    // tie-break: peakRequiredStaff DESC → A wins
    const shiftA = makeShift(1, 'MONDAY', '07:00', '09:00');
    const shiftB = makeShift(2, 'TUESDAY', '07:00', '09:00');
    const txnLookup = {
      MONDAY: { '07:00': 60, '08:00': 60 }, // req=4 each
      TUESDAY: { '07:00': 30, '08:00': 30 }, // req=2 each
    };
    // Give just enough capacity for one slot of A (2h)
    const allocated = allocateStaffSlots([shiftA, shiftB], txnLookup, N, 2);
    const a = allocated.find((x) => x.shift.id === 1)!;
    const b = allocated.find((x) => x.shift.id === 2)!;
    // A should have gotten the one slot (higher peak need)
    expect(a.allocatedSlots).toBe(1);
    expect(b.allocatedSlots).toBe(0);
  });

  it('stops allocating when capacity is exhausted', () => {
    const shift = makeShift(1, 'MONDAY', '07:00', '15:00'); // 8h duration
    const txnLookup = { MONDAY: { '07:00': 30 } }; // peak=2
    // Only 8h capacity — can afford exactly one slot
    const allocated = allocateStaffSlots([shift], txnLookup, N, 8);
    expect(allocated[0].allocatedSlots).toBe(1);
  });

  it('does not allocate beyond peak requirement', () => {
    const shift = makeShift(1, 'MONDAY', '07:00', '08:00'); // 1h, peak=1
    const txnLookup = { MONDAY: { '07:00': 5 } }; // req=1
    // Way more capacity than needed
    const allocated = allocateStaffSlots([shift], txnLookup, N, 100);
    expect(allocated[0].allocatedSlots).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Maximum weekly-hour constraint
// ---------------------------------------------------------------------------

describe('assignStaffToShifts — max weekly-hour constraint', () => {
  const N = 15;

  it('does not exceed a staff member maxHour', () => {
    // One staff with maxHour=8, one shift of 8h needing 2 slots
    const shift = makeShift(1, 'MONDAY', '07:00', '15:00'); // 8h
    const txnLookup = { MONDAY: { '07:00': 30 } }; // peak=2
    const staff = [makeStaff(1, 'Alice', 8), makeStaff(2, 'Bob', 8)];
    const allocated = allocateStaffSlots([shift], txnLookup, N, 16);
    // Set allocatedSlots to 2 manually since we allocated 16h / 8h = 2 slots
    const { draftShifts } = assignStaffToShifts(allocated, staff);
    // Both staff are used (each gets one 8h assignment = their max)
    const assignedIds = draftShifts[0].assignments.map((a) => a.staffId);
    expect(new Set(assignedIds).size).toBe(2);
  });

  it('rejects a staff member whose assigned hours would exceed maxHour', () => {
    // Two 8h shifts both needing 1 slot, but only 1 staff member with maxHour=8
    const shiftA = makeShift(1, 'MONDAY', '07:00', '15:00');
    const shiftB = makeShift(2, 'TUESDAY', '07:00', '15:00');
    const txnLookup = {
      MONDAY: { '07:00': 5 },
      TUESDAY: { '07:00': 5 },
    };
    const staff = [makeStaff(1, 'Solo', 8)];
    const allocated = allocateStaffSlots([shiftA, shiftB], txnLookup, N, 16);
    const { draftShifts } = assignStaffToShifts(allocated, staff);
    const totalAssignments = draftShifts.reduce(
      (s, x) => s + x.assignments.length,
      0,
    );
    // Only one slot can be filled (staff is maxed after first assignment)
    expect(totalAssignments).toBe(1);
  });

  it('does not assign the same staff member twice to the same shift', () => {
    // One shift needing 2 slots (peak=2) and one staff member with maxHour=40
    const shift = makeShift(1, 'MONDAY', '07:00', '15:00'); // 8h
    const txnLookup = { MONDAY: { '07:00': 30 } }; // peak=2
    const staff = [makeStaff(1, 'Alice', 40)];
    const allocated = allocateStaffSlots([shift], txnLookup, N, 16);
    const { draftShifts } = assignStaffToShifts(allocated, staff);
    // Alice should be assigned to slot 1, but NOT slot 2 of the same shift
    expect(draftShifts[0].assignments.length).toBe(1);
    expect(draftShifts[0].assignments[0].staffId).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Insufficient staff capacity
// ---------------------------------------------------------------------------

describe('runAutoSchedule — insufficient capacity', () => {
  it('keeps feasible draft when capacity is insufficient', () => {
    const txns = makeTxns('MONDAY', [
      { hour: '07:00', transactions: 100 }, // req=7
    ]);
    const shifts = [makeShift(1, 'MONDAY', '07:00', '08:00')]; // 1h, peak=7
    const staff = [makeStaff(1, 'Only', 1)]; // maxHour=1, can fill 1 slot
    const draft = runAutoSchedule(txns, shifts, staff, 15);
    // peakRequired=7, but only 1 staff-hour available → 1 slot allocated, 1 assigned
    expect(draft.shifts[0].allocatedSlots).toBe(1);
    expect(draft.shifts[0].assignments.length).toBe(1);
  });

  it('returns empty shifts when no shifts configured', () => {
    const txns = makeTxns('MONDAY', [{ hour: '07:00', transactions: 10 }]);
    const draft = runAutoSchedule(txns, [], [makeStaff(1, 'A', 40)], 15);
    expect(draft.shifts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Workload balancing
// ---------------------------------------------------------------------------

describe('assignStaffToShifts — workload balancing', () => {
  it('prefers the staff member with lowest utilization', () => {
    // Two shifts, 2 staff: Alice (maxHour=40) and Bob (maxHour=10)
    // Each shift is 1h needing 1 slot
    const shifts = [
      makeShift(1, 'MONDAY', '07:00', '08:00'),
      makeShift(2, 'TUESDAY', '07:00', '08:00'),
    ];
    const txnLookup = {
      MONDAY: { '07:00': 5 },
      TUESDAY: { '07:00': 5 },
    };
    const staff = [makeStaff(1, 'Alice', 40), makeStaff(2, 'Bob', 10)];
    const allocated = allocateStaffSlots(shifts, txnLookup, 15, 50);
    const { draftShifts } = assignStaffToShifts(allocated, staff);
    const firstShift = draftShifts.find((s) => s.shiftId === 1)!;
    const secondShift = draftShifts.find((s) => s.shiftId === 2)!;
    expect(firstShift.assignments.length).toBe(1);
    expect(secondShift.assignments.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Aggregated summary calculations
// ---------------------------------------------------------------------------

describe('calculateAggregatedSummary', () => {
  const txns: UploadedTransactions = {
    version: 1,
    days: {
      MONDAY: [
        { hour: '07:00', transactions: 30 },
        { hour: '08:00', transactions: 15 },
      ],
      TUESDAY: [{ hour: '07:00', transactions: 0 }],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    },
  };

  it('computes staffHours correctly per hour', () => {
    const shiftCounts = [
      {
        dayOfWeek: 'MONDAY' as const,
        start: '07:00',
        end: '09:00',
        staffCount: 2,
      },
    ];
    const summary = calculateAggregatedSummary(txns, shiftCounts);
    // MONDAY 07:00 → 2 staff
    expect(summary.cells.MONDAY['07:00'].staffHours).toBe(2);
    // MONDAY 08:00 → 2 staff (shift covers 07–09)
    expect(summary.cells.MONDAY['08:00'].staffHours).toBe(2);
  });

  it('returns null transactionsPerStaffHour when staffHours === 0', () => {
    const shiftCounts = [
      {
        dayOfWeek: 'MONDAY' as const,
        start: '07:00',
        end: '08:00',
        staffCount: 0,
      },
    ];
    const summary = calculateAggregatedSummary(txns, shiftCounts);
    expect(summary.cells.MONDAY['07:00'].transactionsPerStaffHour).toBeNull();
  });

  it('computes overallTransactionsPerStaffHour correctly', () => {
    const shiftCounts = [
      {
        dayOfWeek: 'MONDAY' as const,
        start: '07:00',
        end: '09:00',
        staffCount: 3,
      },
    ];
    const summary = calculateAggregatedSummary(txns, shiftCounts);
    expect(summary.totalTransactions).toBe(45);
    expect(summary.totalStaffHours).toBe(6);
    expect(summary.overallTransactionsPerStaffHour).toBeCloseTo(45 / 6);
  });

  it('overallTransactionsPerStaffHour is null when no staff assigned', () => {
    const summary = calculateAggregatedSummary(txns, []);
    expect(summary.overallTransactionsPerStaffHour).toBeNull();
    expect(summary.averageTransactionsPerStaffHour).toBeNull();
  });

  it('averageTransactionsPerStaffHour is arithmetic mean of non-null cells', () => {
    const shiftCounts = [
      {
        dayOfWeek: 'MONDAY' as const,
        start: '07:00',
        end: '09:00',
        staffCount: 2,
      },
    ];
    const summary = calculateAggregatedSummary(txns, shiftCounts);
    expect(summary.averageTransactionsPerStaffHour).toBeCloseTo(11.25);
  });
});
