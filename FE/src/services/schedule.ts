import axiosInstance from "@/libs/axios";
import { AxiosResponse } from "axios";
import { ApiResponse } from "./common";
import { Shift } from "./shift";

// ---------------------------------------------------------------------------
// Canonical transaction types (mirrors the backend shape)
// ---------------------------------------------------------------------------

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface HourlyTransaction {
  hour: string; // HH:mm, e.g. "07:00"
  transactions: number;
}

export interface UploadedTransactions {
  version: 1;
  days: Record<DayOfWeek, HourlyTransaction[]>;
}

// ---------------------------------------------------------------------------
// Shift definition types (mirrors the backend shape)
// ---------------------------------------------------------------------------

export interface ShiftSlot {
  /** HH:00, e.g. "07:00" */
  start: string;
  /** HH:00, e.g. "15:00" */
  end: string;
}

export type ShiftDefinition = ShiftSlot[];

// ---------------------------------------------------------------------------
// Schedule interfaces
// ---------------------------------------------------------------------------

export interface Schedule {
  id: number;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  uploadedTxns: UploadedTransactions | null;
  shiftDefinition: ShiftDefinition | null;
}

export interface ScheduleShifts {
  id: number;
  startDate: string;
  shiftDefinition: ShiftDefinition | null;
  shifts: Shift[];
}

export interface ScheduleOverview {
  id: number;
  createdAt: string;
  updatedAt: string;
  startDate: string;
}

export interface ScheduleCreateReq {
  startDate: string;
}

export interface ScheduleListResult {
  items: ScheduleOverview[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const scheduleApi = {
  create: async (
    body: ScheduleCreateReq
  ): Promise<AxiosResponse<ApiResponse<ScheduleOverview>>> => {
    return axiosInstance.post<ApiResponse<ScheduleOverview>>("/schedules", body);
  },

  getAll: async (
    page: number = 1,
    limit: number = 10
  ): Promise<AxiosResponse<ApiResponse<ScheduleListResult>>> => {
    return axiosInstance.get<ApiResponse<ScheduleListResult>>("/schedules", {
      params: { page, limit },
    });
  },

  getById: async (
    id: number
  ): Promise<AxiosResponse<ApiResponse<Schedule>>> => {
    return axiosInstance.get<ApiResponse<Schedule>>(`/schedules/${id}`);
  },

  uploadTxns: async (
    id: number,
    file: File
  ): Promise<AxiosResponse<ApiResponse<UploadedTransactions>>> => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post<ApiResponse<UploadedTransactions>>(
      `/schedules/${id}/upload-txns`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  getScheduleShifts: async (
    id: number
  ): Promise<AxiosResponse<ApiResponse<ScheduleShifts>>> => {
    return axiosInstance.get<ApiResponse<ScheduleShifts>>(`/schedules/${id}/shifts`);
  },

  updateShiftDefinition: async (
    id: number,
    shifts: ShiftSlot[]
  ): Promise<AxiosResponse<ApiResponse<ShiftDefinition>>> => {
    return axiosInstance.put<ApiResponse<ShiftDefinition>>(
      `/schedules/${id}/shift-definition`,
      { shifts }
    );
  },
};