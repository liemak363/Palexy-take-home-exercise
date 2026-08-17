"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useApi, useApiEffect } from "@/hooks/useApi";
import { staffApi, StaffListResult, Staff, CreateStaffReq } from "@/services/staff";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/utils/formatDate";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIMIT = 10;

const emptyResult: StaffListResult = {
  items: [],
  total: 0,
  page: 1,
  limit: LIMIT,
};

// ---------------------------------------------------------------------------
// Create Staff Modal
// ---------------------------------------------------------------------------

interface CreateStaffModalProps {
  onClose: () => void;
  onCreated: (staff: Staff) => void;
}

function CreateStaffModal({ onClose, onCreated }: CreateStaffModalProps) {
  const [name, setName] = useState("");
  const [maxHour, setMaxHour] = useState<number | "">("");

  const { loading, error, execute: createStaff } = useApi(
    staffApi.create,
    null as unknown as Staff
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || maxHour === "") return;

    try {
      const created = await createStaff({ name: name.trim(), maxHour: Number(maxHour) } as CreateStaffReq);
      toast.success(`Staff "${created.name}" created successfully.`);
      onCreated(created);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to create staff.";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        New Staff Member
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Add a new staff member with their weekly hour cap.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="create-staff-name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Name
          </label>
          <input
            id="create-staff-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice Smith"
            required
            minLength={1}
            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>

        <div>
          <label
            htmlFor="create-staff-max-hour"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Max Hours / Week
          </label>
          <input
            id="create-staff-max-hour"
            type="number"
            min={0}
            value={maxHour}
            onChange={(e) =>
              setMaxHour(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="e.g. 40"
            required
            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || maxHour === ""}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {loading ? "Creating…" : "Create Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  staff: Staff;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({
  staff,
  onClose,
  onDeleted,
}: DeleteConfirmModalProps) {
  const { loading, execute: deleteStaff } = useApi(
    staffApi.softDelete,
    null as unknown as Staff
  );

  const handleConfirm = async () => {
    try {
      await deleteStaff(staff.id);
      toast.success(`"${staff.name}" has been deleted.`);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to delete staff.";
      toast.error(message);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        Delete Staff
      </h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Are you sure you want to delete{" "}
        <strong className="text-gray-700 dark:text-gray-200">
          {staff.name}
        </strong>
        ? This action can be reviewed but will mark them as inactive.
      </p>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StaffsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchStaffs = useCallback(
    (p: number, l: number) => staffApi.getAll(p, l),
    []
  );

  const {
    data: result,
    loading,
    error,
    refetch,
  } = useApiEffect(
    fetchStaffs,
    emptyResult,
    [page, LIMIT] as [number, number],
    (err) => {
      toast.error((err as { message?: string })?.message ?? "Failed to load staffs.");
    },
    [page]
  );

  const { items, total } = result;
  const totalPages = Math.ceil(total / LIMIT);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const handleDeleted = () => {
    if (page !== 1) setPage(1);
    else refetch();
  };

  const handleCreated = () => {
    if (page !== 1) setPage(1);
    else refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Staffs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and manage all staff members, including deleted ones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            title="Refresh"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <button
            id="open-create-staff-modal"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Staff
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg
                  className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  No staff members found
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Name</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Max Hours</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Created At</th>
                      <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((staff) => (
                      <tr
                        key={staff.id}
                        className="group cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        onClick={() => router.push(`/staffs/${staff.id}`)}
                      >
                        <td className="px-6 py-4">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                            {staff.id}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white/90">
                          {staff.name}
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {staff.maxHour}h
                        </td>
                        <td className="px-6 py-4">
                          {staff.isDeleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Deleted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {formatDateTime(staff.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            id={`delete-staff-${staff.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setStaffToDelete(staff);
                            }}
                            disabled={staff.isDeleted}
                            title={staff.isDeleted ? "Already deleted" : "Delete staff"}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            Page <strong className="text-gray-800 dark:text-white">{page}</strong>{" "}
            of{" "}
            <strong className="text-gray-800 dark:text-white">{totalPages}</strong>
            {" · "}
            <span>{total} total</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              ← Prev
            </button>
            <button
              onClick={handleNext}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {staffToDelete && (
        <Modal isOpen onClose={() => setStaffToDelete(null)} className="max-w-md mx-4 sm:mx-auto">
          <DeleteConfirmModal
            staff={staffToDelete}
            onClose={() => setStaffToDelete(null)}
            onDeleted={handleDeleted}
          />
        </Modal>
      )}

      {/* Create Staff Modal */}
      {createModalOpen && (
        <Modal isOpen onClose={() => setCreateModalOpen(false)} className="max-w-md mx-4 sm:mx-auto">
          <CreateStaffModal
            onClose={() => setCreateModalOpen(false)}
            onCreated={handleCreated}
          />
        </Modal>
      )}
    </div>
  );
}
