// components/DeleteAccount.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CSRFToken } from "@/utils/security";
import { useAuth } from "@/contexts/AuthContext";

interface DeletionLog {
  table: string;
  deleted: number;
}

export default function DeleteAccount() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionLog, setDeletionLog] = useState<DeletionLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE MY ACCOUNT") {
      setError('Please type "DELETE MY ACCOUNT" exactly as shown');
      return;
    }

    if (!user) {
      setError("You must be signed in to delete your account");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setDeletionLog([]);

    try {
      const csrfToken = CSRFToken.get();

      // Call the API route with CSRF token
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          csrfToken,
          userId: user.id, // Include user ID for verification
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Show deletion log
      if (data.deletionLog && data.deletionLog.length > 0) {
        setDeletionLog(data.deletionLog);
        setShowLog(true);

        // Wait to show results
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Clear all local storage and session storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });

      // Redirect to home with success message
      router.push("/?account-deleted=true");
    } catch (error) {
      console.error("Error deleting account:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete account"
      );
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setConfirmText("");
    setError(null);
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-red-800 mb-4">
        Delete Account
      </h3>

      <div className="space-y-4">
        <p className="text-red-700">
          This will permanently delete your account and all associated data
          including:
        </p>

        <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
          <li>All evidence submissions</li>
          <li>Personal information</li>
          <li>Activity logs</li>
          <li>Account settings</li>
        </ul>

        <div className="bg-red-100 border border-red-300 rounded p-3">
          <p className="text-red-800 font-semibold text-sm">
            ⚠️ This action cannot be undone!
          </p>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-red-700 mb-2">
                To confirm deletion, type{" "}
                <strong className="font-mono bg-red-100 px-2 py-1 rounded">
                  DELETE MY ACCOUNT
                </strong>{" "}
                in the box below:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError(null);
                }}
                className="w-full p-2 border border-red-300 rounded font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="DELETE MY ACCOUNT"
                disabled={isDeleting}
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 rounded p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmText !== "DELETE MY ACCOUNT"}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Deleting...
                  </span>
                ) : (
                  "Permanently Delete"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deletion log modal */}
      {showLog && deletionLog.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Account Deletion Complete
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              The following data was permanently deleted:
            </p>
            <div className="space-y-2 mb-6">
              {deletionLog.map((log, idx) => (
                <div key={idx} className="flex justify-between py-2 border-b">
                  <span className="text-gray-700">{log.table}</span>
                  <span className="font-mono text-gray-900">
                    {log.deleted} {log.deleted === 1 ? "row" : "rows"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-green-600 font-medium mb-2">
                ✓ Account successfully deleted
              </p>
              <p className="text-sm text-gray-600">
                Redirecting to home page...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
