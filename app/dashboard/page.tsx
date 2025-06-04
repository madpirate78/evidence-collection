// app/dashboard/page.tsx - Minimal data view for security
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import DeleteAccount from "@/components/DeleteAccount";
import { DateDisplay } from "@/utils/dateUtils";
import { CSRFToken } from "@/utils/security";

// Minimal submission interface - only what's needed for identification
interface MinimalSubmission {
  id: number;
  created_at: string;
  children_affected?: number;
  impact_severity?: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading, initialised } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<MinimalSubmission[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasRedirected = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (!initialised || authLoading || !user) {
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        setError(null);
        // Only fetch minimal fields needed for identification
        const { data, error } = await supabase
          .from("evidence_submissions")
          .select("id, created_at, children_affected, impact_severity")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setSubmissions(data || []);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load submissions"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user, initialised, authLoading, supabase]);

  const handleDeleteSubmissions = async () => {
    if (selectedSubmissions.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedSubmissions.size} submission(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    const csrfToken = CSRFToken.get();

    try {
      const deletePromises = Array.from(selectedSubmissions).map(
        async (submissionId) => {
          const { error } = await supabase.rpc("delete_submission_cascade", {
            submission_id_input: submissionId,
            csrf_token: csrfToken,
          });

          if (error) {
            const { error: directError } = await supabase
              .from("evidence_submissions")
              .delete()
              .eq("id", submissionId)
              .eq("user_id", user!.id);

            if (directError) throw directError;
          }
        }
      );

      await Promise.all(deletePromises);

      setSubmissions((prev) =>
        prev.filter((s) => !selectedSubmissions.has(s.id))
      );
      setSelectedSubmissions(new Set());

      alert(`Successfully deleted ${selectedSubmissions.size} submission(s).`);
    } catch (error) {
      console.error("Error deleting submissions:", error);
      alert("Failed to delete some submissions. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelection = (submissionId: number) => {
    setSelectedSubmissions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === submissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(submissions.map((s) => s.id)));
    }
  };

  if (!initialised || authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-gray-600">No user session found</p>
          <Link
            href="/sign-in"
            className="text-blue-600 hover:underline mt-2 inline-block"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Dashboard</h1>

        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-lg font-semibold mb-2">Welcome, {user?.email}</h2>
          <p className="mb-4">View and manage your evidence submissions.</p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Security Notice:</strong> For privacy and security, only
              submission dates are shown. Full submission details cannot be
              retrieved after upload.
            </p>
          </div>

          <div className="mt-4">
            <Link
              href="/statement-portal"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Submit New Evidence
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Submissions</h2>
            {submissions.length > 0 && (
              <button
                onClick={handleDeleteSubmissions}
                disabled={selectedSubmissions.size === 0 || isDeleting}
                className={`px-4 py-2 text-sm rounded transition ${
                  selectedSubmissions.size > 0
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isDeleting
                  ? "Deleting..."
                  : `Delete (${selectedSubmissions.size})`}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {submissions.length === 0 ? (
            <p className="text-gray-600">
              You haven't submitted any evidence yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedSubmissions.size === submissions.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Submission Date
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Children
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Impact
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(submission.id)}
                          onChange={() => toggleSelection(submission.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium inline-block">
                          <DateDisplay
                            date={submission.created_at}
                            includeTime
                          />
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {submission.children_affected || "—"}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {submission.impact_severity
                          ? `${submission.impact_severity}/10`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>Total submissions: {submissions.length}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Account Management</h2>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
