import axios, { AxiosInstance, AxiosResponse } from "axios";


// Create axios instance with base configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:7030/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Default: don't send cookies unless explicitly needed
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common response scenarios
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (
      error.response?.status === 400 ||
      error.response?.status === 401 ||
      error.response?.status === 403 ||
      error.response?.status === 404 ||
      error.response?.status === 409
    ) {
      return Promise.reject({
        message: error.response?.data?.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    if (error.response?.status >= 500) {
      // Server error - handle server errors
      // console.error("Hệ thống gặp lỗi:", error.response.data);
      return Promise.reject({
        message: error.response?.data?.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    if (error.request) {
      return Promise.reject({
        message: "Lỗi mạng. Vui lòng kiểm tra kết nối của bạn.",
        status: 0,
        data: null,
      });
    }

    return Promise.reject({
      message: "Đã xảy ra lỗi không mong muốn",
      status: 0,
      data: null,
    });
  },
);

export default axiosInstance;
