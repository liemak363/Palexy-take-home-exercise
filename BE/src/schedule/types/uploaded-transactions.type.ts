import { DayOfWeek } from './common.type';

export type HourlyTransaction = {
  hour: string; // HH:mm, e.g. "07:00"
  transactions: number;
};

export type UploadedTransactions = {
  version: 1;
  days: Record<DayOfWeek, HourlyTransaction[]>;
};
