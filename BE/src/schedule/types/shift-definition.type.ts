/** A single contiguous shift slot. Both `start` and `end` are "HH:00". */
export type ShiftSlot = {
  /** HH:00, e.g. "07:00" */
  start: string;
  /** HH:00, e.g. "15:00" */
  end: string;
};

/**
 * An ordered list of non-overlapping shift slots that together must
 * cover the full operating day from 07:00 to 23:00.
 */
export type ShiftDefinition = ShiftSlot[];
