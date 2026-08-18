import axiosInstance from "@/libs/axios";
import { AxiosResponse } from "axios";
import { ApiResponse } from "./common";

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
// Schedule interfaces
// ---------------------------------------------------------------------------

export interface Schedule {
  id: number;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  uploadedTxns: UploadedTransactions | null;
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
};