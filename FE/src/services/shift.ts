import { DayOfWeek } from "./common";

export interface ShiftAssignment {
  id: number;
  staffId: number;
  staff: {
    id: number;
    name: string;
  };
}

export interface Shift {
  id: number;
  scheduleId: number;
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  assignments: ShiftAssignment[];
}