import { AxiosResponse } from "axios";

// Types for API responses
export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

// Generic API utility functions
export const apiUtils = {
  // Extract data from API response
  extractData: <T>(response: AxiosResponse<ApiResponse<T>>): T => {
    return response.data.data;
  },
};

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";