"use client";
// make this file no need any linting error
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useCallback } from "react";
import { AxiosResponse } from "axios";
import { ApiResponse } from "@/services/common";
import { apiUtils } from "@/services/common";

interface UseApiState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

// 1. Update Interface to accept Args generic
interface UseApiReturn<T, Args extends unknown[]> extends UseApiState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  // 2. Type the execute function with Args
  execute: (...args: Args) => Promise<T>;
  reset: () => void;
}

/**
 * Custom hook for handling API calls with loading and error states
 */
export function useApi<T, Args extends unknown[] = unknown[]>(
  // 3. Ensure apiFunction uses the same Args generic
  apiFunction: (...args: Args) => Promise<AxiosResponse<ApiResponse<T>>>,
  initialData: T,
  defaultErrorMessage: string = "Đã xảy ra lỗi.",
): UseApiReturn<T, Args> {
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  // 4. Update execute implementation signature
  const execute = useCallback(
    async (...args: Args): Promise<T> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);
        const data = apiUtils.extractData(response);

        setState((prev) => ({
          ...prev,
          data,
          loading: false,
        }));

        return data;
      } catch (error: any) {
        // const apiError = apiUtils.handleApiError(error);

        setState((prev) => ({
          ...prev,
          error: error.message || defaultErrorMessage,
          loading: false,
        }));
        console.error("API call error:", JSON.stringify(error, null, 2));
        if (!error.message) {
          error.message = defaultErrorMessage;
        }

        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFunction],
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      loading: false,
      error: null,
    });
  }, [initialData]);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Custom hook for API calls that execute immediately on mount
 * @param apiFunction - The API function to call
 * @param initialData - Initial data state
 * @param params - Parameters to pass to the API function
 * @param dependencies - Dependencies array for useEffect
 * @returns Object with data, loading, error, refetch function, and reset function
 */
export function useApiEffect<T, Args extends unknown[] = unknown[]>(
  apiFunction: (...args: Args) => Promise<AxiosResponse<ApiResponse<T>>>,
  initialData: T,
  params: Args,
  catchFunc?: (err: any) => void,
  dependencies: React.DependencyList = [],
  defaultErrorMessage: string = "Đã xảy ra lỗi.",
): UseApiReturn<T, Args> & { refetch: () => Promise<T> } {
  const { data, loading, error, execute, reset } = useApi(
    apiFunction,
    initialData,
    defaultErrorMessage,
  );

  const refetch = useCallback(() => {
    return execute(...params);
  }, [execute, params]);

  // Execute on mount and when dependencies change
  React.useEffect(() => {
    const execute = async () => {
      try {
        await refetch();
      } catch (err) {
        if (catchFunc) {
          catchFunc(err);
        }
      }
    };
    execute();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, ...dependencies]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    refetch,
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface UseApiStateNoData extends Omit<UseApiState<unknown>, "data"> {}

// 1. Update Interface to accept Args generic
interface UseApiReturnNoData<Args extends unknown[]> extends UseApiStateNoData {
  loading: boolean;
  error: string | null;
  // 2. Type the execute function with Args
  execute: (...args: Args) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for handling API calls with loading and error states but no data
 */
export function useApiNoData<Args extends unknown[] = unknown[]>(
  // 3. Ensure apiFunction uses the same Args generic
  apiFunction: (...args: Args) => Promise<unknown>,
  defaultErrorMessage: string = "Đã xảy ra lỗi.",
): UseApiReturnNoData<Args> {
  const [state, setState] = useState<UseApiStateNoData>({
    loading: false,
    error: null,
  });

  // 4. Update execute implementation signature
  const execute = useCallback(
    async (...args: Args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await apiFunction(...args);

        setState((prev) => ({
          ...prev,
          loading: false,
        }));
      } catch (error: any) {
        // const apiError = apiUtils.handleApiError(error);

        setState((prev) => ({
          ...prev,
          error: error.message || defaultErrorMessage,
          loading: false,
        }));
        if (!error.message) {
          error.message = defaultErrorMessage;
        }

        throw error;
      }
    },
    [apiFunction, defaultErrorMessage],
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

interface UseApiDownloadReturn<
  Args extends unknown[],
> extends UseApiStateNoData {
  loading: boolean;
  error: string | null;
  // execute nhận thêm 1 tham số tùy chọn là defaultFileName phòng khi header không trả về tên file
  execute: (defaultFileName?: string, ...args: Args) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook dành riêng cho việc tải file (Blob)
 * Xử lý loading, error, và tự động tạo thẻ <a> để kích hoạt download trên trình duyệt.
 */
export function useApiDownload<Args extends unknown[] = unknown[]>(
  apiFunction: (...args: Args) => Promise<AxiosResponse<Blob>>,
  defaultErrorMessage: string = "Đã xảy ra lỗi khi tải file.",
): UseApiDownloadReturn<Args> {
  const [state, setState] = useState<UseApiStateNoData>({
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (defaultFileName: string = "downloaded_file", ...args: Args) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await apiFunction(...args);

        // 1. Trích xuất tên file từ header (nếu backend có trả về Header Content-Disposition)
        let fileName = defaultFileName;
        const disposition = response.headers["content-disposition"];
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, "");
          }
        }

        // 2. Lấy content-type an toàn (Type Narrowing)
        const rawContentType = response.headers["content-type"];
        const contentType =
          typeof rawContentType === "string"
            ? rawContentType
            : "application/octet-stream";

        // 3. Tạo Blob với type đã được đảm bảo chắc chắn là string
        const blob = new Blob([response.data], {
          type: contentType,
        });

        const url = window.URL.createObjectURL(blob);

        // 4. Giả lập hành động click tải file
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();

        // 5. Dọn dẹp memory
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);

        setState((prev) => ({
          ...prev,
          loading: false,
        }));
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          error: error.message || defaultErrorMessage,
          loading: false,
        }));
        console.error("API Download error:", error);

        if (!error.message) {
          error.message = defaultErrorMessage;
        }
        throw error;
      }
    },
    [apiFunction, defaultErrorMessage],
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
