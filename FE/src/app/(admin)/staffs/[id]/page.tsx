"use client";

import React, { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useApi, useApiEffect } from "@/hooks/useApi";
import { staffApi, Staff, UpdateStaffReq } from "@/services/staff";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/utils/formatDate";

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------

interface DeleteConfirmModalProps {
  staff: Staff;
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteConfirmModal({ staff, onClose, onDeleted }: DeleteConfirmModalProps) {
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
        <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Delete Staff</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Are you sure you want to delete{" "}
        <strong className="text-gray-700 dark:text-gray-200">{staff.name}</strong>?
        This will mark them as inactive.
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

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const staffId = Number(params.id);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMaxHour, setFormMaxHour] = useState<number>(0);

  // ---- Fetch staff ----
  const fetchStaff = useCallback((id: number) => staffApi.getById(id), []);

  const {
    data: staff,
    loading: fetchLoading,
    error: fetchError,
    refetch,
  } = useApiEffect(
    fetchStaff,
    null as unknown as Staff,
    [staffId] as [number],
    (err) => {
      toast.error((err as { message?: string })?.message ?? "Failed to load staff.");
    },
    [staffId]
  );

  // ---- Update staff ----
  const { loading: updateLoading, execute: updateStaff } = useApi(
    (id: number, body: UpdateStaffReq) => staffApi.update(id, body),
    null as unknown as Staff
  );

  const handleEditClick = () => {
    if (staff) {
      setFormName(staff.name);
      setFormMaxHour(staff.maxHour);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;

    try {
      await updateStaff(staffId, { name: formName, maxHour: formMaxHour });
      toast.success("Staff updated successfully.");
      setIsEditing(false);
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Failed to update staff.";
      toast.error(message);
    }
  };

  const handleDeleted = () => {
    router.push("/staffs");
  };

  // ---- Render states ----
  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (fetchError || !staff) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <svg className="mb-4 h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {fetchError ?? "Staff not found."}
        </p>
        <button
          onClick={() => router.push("/staffs")}
          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          ← Back to Staffs
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/staffs")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {staff.name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Staff ID #{staff.id}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              id="edit-staff-btn"
              onClick={handleEditClick}
              disabled={staff.isDeleted}
              title={staff.isDeleted ? "Cannot edit a deleted staff" : "Edit staff"}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          <button
            id="delete-staff-btn"
            onClick={() => setDeleteModalOpen(true)}
            disabled={staff.isDeleted}
            title={staff.isDeleted ? "Already deleted" : "Delete staff"}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Detail Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {isEditing ? (
          /* Edit Form */
          <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Edit Details
            </h2>

            <div>
              <label
                htmlFor="staff-name"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Name
              </label>
              <input
                id="staff-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                minLength={1}
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label
                htmlFor="staff-max-hour"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Max Hours per Week
              </label>
              <input
                id="staff-max-hour"
                type="number"
                min={0}
                value={formMaxHour}
                onChange={(e) => setFormMaxHour(Number(e.target.value))}
                required
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={updateLoading}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateLoading || !formName.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateLoading && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {updateLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Status banner for deleted staff */}
            {staff.isDeleted && (
              <div className="flex items-center gap-3 bg-red-50 px-6 py-3 dark:bg-red-900/20">
                <svg className="h-4 w-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-400">
                  This staff member has been deleted and cannot be edited.
                </span>
              </div>
            )}

            {[
              { label: "ID", value: String(staff.id) },
              { label: "Name", value: staff.name },
              { label: "Max Hours / Week", value: `${staff.maxHour}h` },
              {
                label: "Status",
                value: staff.isDeleted ? "Deleted" : "Active",
                badge: true,
                deleted: staff.isDeleted,
              },
              { label: "Created At", value: formatDateTime(staff.createdAt) },
              { label: "Updated At", value: formatDateTime(staff.updatedAt) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-6 py-4"
              >
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {row.label}
                </span>
                {row.badge ? (
                  row.deleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Deleted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  )
                ) : (
                  <span className="text-sm text-gray-800 dark:text-white/90">
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <Modal isOpen onClose={() => setDeleteModalOpen(false)} className="max-w-md mx-4 sm:mx-auto">
          <DeleteConfirmModal
            staff={staff}
            onClose={() => setDeleteModalOpen(false)}
            onDeleted={handleDeleted}
          />
        </Modal>
      )}
    </div>
  );
}
