import axiosInstance from "@/libs/axios";
import { AxiosResponse } from "axios";
import { ApiResponse } from "./common";

export interface Staff {
  id: number;
  name: string;
  maxHour: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListResult {
  items: Staff[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateStaffReq {
  name?: string;
  maxHour?: number;
}

export interface CreateStaffReq {
  name: string;
  maxHour: number;
}

export const staffApi = {
  create: async (
    body: CreateStaffReq
  ): Promise<AxiosResponse<ApiResponse<Staff>>> => {
    return axiosInstance.post<ApiResponse<Staff>>("/staffs", body);
  },

  getAll: async (
    page: number = 1,
    limit: number = 10
  ): Promise<AxiosResponse<ApiResponse<StaffListResult>>> => {
    return axiosInstance.get<ApiResponse<StaffListResult>>("/staffs", {
      params: { page, limit },
    });
  },

  getById: async (
    id: number
  ): Promise<AxiosResponse<ApiResponse<Staff>>> => {
    return axiosInstance.get<ApiResponse<Staff>>(`/staffs/${id}`);
  },

  update: async (
    id: number,
    body: UpdateStaffReq
  ): Promise<AxiosResponse<ApiResponse<Staff>>> => {
    return axiosInstance.patch<ApiResponse<Staff>>(`/staffs/${id}`, body);
  },

  softDelete: async (
    id: number
  ): Promise<AxiosResponse<ApiResponse<Staff>>> => {
    return axiosInstance.delete<ApiResponse<Staff>>(`/staffs/${id}`);
  },
};