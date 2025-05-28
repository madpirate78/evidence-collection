// app/dashboard/page.tsx - Fixed redirect loop
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import DeleteAccount from "@/components/DeleteAccount";
import { DateDisplay } from "@/utils/dateUtils";
import { clientSafeId } from "@/utils/secureId";
import { CSRFToken } from "@/utils/security";

// Interface definitions
interface Submission {
  id: number;
  created_at: string;
  user_id: string;
  full_name: string;
  email: string;
  case_number?: string;
  case_start_date?: string;
  issue_category: string;
  description: string;
  impact_statement?: string;
  consent_given: boolean;
  is_redacted?: boolean;
  // Additional fields for evidence_v2
  submission_type?: string;
  paying_or_receiving?: string;
  shared_care_nights?: number;
  fictitious_arrears_amount?: number;
  monthly_payment_demanded?: number;
  children_affected?: number;
  impact_severity?: number;
  has_equal_care?: boolean;
  facing_enforcement?: boolean;
  has_fictitious_arrears?: boolean;
  child_told_less_money?: boolean;
  child_lost_bedroom?: boolean;
  child_anxiety_money?: boolean;
  school_attendance_before?: number;
  school_attendance_after?: number;
  child_impact_statement?: string;
  gender?: string;
  child_benefit_holder?: string;
  actual_arrears_amount?: number;
  regulation_50_attempted?: boolean;
  regulation_50_outcome?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, initialised } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Add redirect guard
  const hasRedirected = useRef(false);

  const supabase = createClient();

  // Fixed auth redirect with guard
  useEffect(() => {
    // Skip if not initialized or already redirected
    if (!initialised || authLoading || !user) {
      setLoading(false);
      return;
    }

    const fetchSubmissions = async () => {
      try {
        setError(null);
        const { data, error } = await supabase
          .from("evidence_submissions")
          .select("*")
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
      // Delete submissions one by one
      const deletePromises = Array.from(selectedSubmissions).map(
        async (submissionId) => {
          const { error } = await supabase.rpc("delete_submission_cascade", {
            submission_id_input: submissionId,
            csrf_token: csrfToken,
          });

          if (error) {
            // Fallback to direct delete if RPC doesn't exist
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

      // Update local state
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

  // Show loading while auth is initializing
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

  //  If we get here with no user, the middleware should have already redirected
  // This is just a fallback UI
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
  /*
  // Don't render dashboard content if no user
  if (!user || !authCheckComplete) {
    return null;
  }
  // Show loading while fetching submissions
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }*/

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Dashboard</h1>

        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-lg font-semibold mb-2">Welcome, {user?.email}</h2>
          <p className="mb-4">
            Manage your evidence submissions and track their status.
          </p>

          <div className="mt-4 flex gap-4">
            <Link
              href="/statement-portal"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Submit New Evidence
            </Link>
            {error && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
              >
                Retry
              </button>
            )}
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
                      Date
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Case #
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Children
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Impact
                    </th>
                    <th className="text-left p-2 text-sm font-medium text-gray-700">
                      Actions
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
                      <td className="p-2">
                        <DateDisplay date={submission.created_at} />
                      </td>
                      <td className="p-2 text-sm">
                        {submission.case_number || "N/A"}
                      </td>
                      <td className="p-2 text-sm">
                        {submission.submission_type === "evidence_v2"
                          ? "Evidence"
                          : "Other"}
                      </td>
                      <td className="p-2 text-sm">
                        {submission.children_affected || "N/A"}
                      </td>
                      <td className="p-2 text-sm">
                        {submission.impact_severity
                          ? `${submission.impact_severity}/10`
                          : "N/A"}
                      </td>
                      <td className="p-2">
                        <Link
                          href={`/view-submission?id=${clientSafeId.encode(submission.id)}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Account Management</h2>
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
