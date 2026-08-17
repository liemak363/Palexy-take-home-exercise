import axiosInstance from "@/libs/axios";
import { AxiosResponse } from "axios";
import { ApiResponse } from "./common";
import { Shift } from "./shift";

export interface Schedule {
  id: number;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  uploadedTxns: string | null;
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

export const scheduleApi = {
  create: async (
    params: ScheduleCreateReq
  ): Promise<AxiosResponse<ApiResponse<Schedule>>> => {
    return axiosInstance.post<ApiResponse<Schedule>>("/schedules", { params });
  },

  getAll: async (
    page: number = 1,
    limit: number = 10
  ): Promise<AxiosResponse<ApiResponse<ScheduleListResult>>> => {
    return axiosInstance.get<ApiResponse<ScheduleListResult>>("/schedules", {
      params: { page, limit },
    });
  },
};