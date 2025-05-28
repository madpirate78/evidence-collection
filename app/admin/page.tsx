// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLogger } from "@/utils/adminLogger";
import { DateDisplay } from "@/utils/dateUtils";
import { CSRFToken } from "@/utils/security";

interface Submission {
  id: number;
  created_at: string;
  user_id: string;
  full_name: string;
  email: string;
  case_number?: string;
  issue_category: string;
  description: string;
  submission_type?: string;
  paying_or_receiving?: string;
  shared_care_nights?: number;
  fictitious_arrears_amount?: number;
  monthly_payment_demanded?: number;
  children_affected?: number;
  impact_severity?: number;
  has_equal_care?: boolean;
  child_told_less_money?: boolean;
  regulation_50_attempted?: boolean;
  regulation_50_outcome?: string;
  facing_enforcement?: boolean;
  child_lost_bedroom?: boolean;
  child_anxiety_money?: boolean;
  school_attendance_before?: number;
  school_attendance_after?: number;
  child_impact_statement?: string;
  gender?: string;
  has_fictitious_arrears?: boolean;
  child_benefit_holder?: string;
  actual_arrears_amount?: number;
}

// Pagination constants
const ITEMS_PER_PAGE = 50;

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const supabase = createClient();
  const logger = new AdminLogger(supabase);

  // Fetch submissions with pagination
  useEffect(() => {
    if (!user || !isAdmin || authLoading) return;

    const fetchSubmissions = async () => {
      try {
        setError(null);

        // Get total count
        const { count } = await supabase
          .from("evidence_submissions")
          .select("*", { count: "exact", head: true })
          .eq("submission_type", "evidence_v2");

        setTotalCount(count || 0);

        // Fetch page of submissions
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;

        const { data, error } = await supabase
          .from("evidence_submissions")
          .select("*")
          .eq("submission_type", "evidence_v2")
          .order("created_at", { ascending: false })
          .range(start, end);

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
  }, [user, isAdmin, authLoading, currentPage, supabase]);

  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      total: totalCount,
      totalFictitiousArrears: 0,
      avgFictitiousArrears: 0,
      equalCareStillPaying: 0,
      childManipulation: 0,
      regulation50Rejected: 0,
      avgImpactSeverity: 0,
    };

    // Note: These are only for the current page
    // For full stats, use the statistics service
    submissions.forEach((s) => {
      stats.totalFictitiousArrears += s.fictitious_arrears_amount || 0;
      if (s.has_equal_care && (s.monthly_payment_demanded || 0) > 0) {
        stats.equalCareStillPaying++;
      }
      if (s.child_told_less_money) stats.childManipulation++;
      if (s.regulation_50_outcome === "rejected") stats.regulation50Rejected++;
    });

    const arrearsCount = submissions.filter(
      (s) => s.fictitious_arrears_amount
    ).length;
    if (arrearsCount > 0) {
      stats.avgFictitiousArrears = stats.totalFictitiousArrears / arrearsCount;
    }

    const severityCount = submissions.filter((s) => s.impact_severity).length;
    if (severityCount > 0) {
      stats.avgImpactSeverity =
        submissions
          .filter((s) => s.impact_severity)
          .reduce((sum, s) => sum + (s.impact_severity || 0), 0) /
        severityCount;
    }

    return stats;
  };

  const stats = calculateStats();

  // Generate anonymous ID
  const getAnonymousId = (id: number) => {
    return `EV-${(id + 10000).toString(36).toUpperCase()}`;
  };

  // Export functions with progress tracking
  const exportToCSV = async () => {
    if (!user || !isAdmin) {
      alert("Unauthorized");
      return;
    }

    const csrfToken = CSRFToken.get();
    setExportProgress("Starting export...");

    try {
      // Log the export
      await logger.logExport(user.id, "full_csv_export", totalCount);

      setExportProgress("Fetching all submissions...");

      // Fetch all submissions (not just current page)
      const { data: allSubmissions, error } = await supabase
        .from("evidence_submissions")
        .select("*")
        .eq("submission_type", "evidence_v2")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setExportProgress("Processing data...");

      // Build CSV content
      const timestamp = new Date().toISOString().split("T")[0];
      const headers = [
        "Evidence ID",
        "Submission Date",
        "Parent Type",
        "Gender",
        "Shared Care Nights/Week",
        "Monthly Payment (£)",
        "Fictitious Arrears (£)",
        "Children Affected",
        "Impact Severity",
        "Equal Care",
        "Enforcement",
        "Child Manipulation",
        "Reg 50 Attempted",
        "Reg 50 Outcome",
      ];

      const rows = allSubmissions!.map((s) => [
        getAnonymousId(s.id),
        new Date(s.created_at).toLocaleDateString("en-GB"),
        s.paying_or_receiving || "N/A",
        s.gender || "Not specified",
        s.shared_care_nights || 0,
        s.monthly_payment_demanded || 0,
        s.fictitious_arrears_amount || 0,
        s.children_affected || 0,
        s.impact_severity || "N/A",
        s.has_equal_care ? "Yes" : "No",
        s.facing_enforcement ? "Yes" : "No",
        s.child_told_less_money ? "Yes" : "No",
        s.regulation_50_attempted ? "Yes" : "No",
        s.regulation_50_outcome || "N/A",
      ]);

      setExportProgress("Creating file...");

      // Create CSV
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      // Download
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `cms-evidence-export-${timestamp}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      setExportProgress(null);
      alert(`Export complete! ${allSubmissions!.length} records exported.`);
    } catch (error) {
      console.error("Export error:", error);
      setExportProgress(null);
      alert("Export failed. Please try again.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            Access Denied
          </h2>
          <p className="text-red-700">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            disabled={!!exportProgress}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {exportProgress || "Export Full Report (CSV)"}
          </button>
        </div>
      </div>

      {/* Admin info */}
      <div className="bg-gray-100 p-3 rounded mb-6">
        <p className="text-sm text-gray-600">
          Logged in as admin: <strong>{user?.email}</strong>
        </p>
      </div>

      {/* Quick Stats (from current page only) */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Statistics below are for the current page only.
          For full statistics, visit the{" "}
          <a href="/statistics" className="underline">
            statistics page
          </a>
          .
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Evidence Submissions ({totalCount} total)
          </h2>
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {submissions.length === 0 ? (
          <p className="text-gray-600">No submissions found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Date
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      ID
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Type
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Arrears
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Monthly
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Impact
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-gray-700">
                      Issues
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <DateDisplay date={submission.created_at} />
                      </td>
                      <td className="p-3 font-mono text-sm">
                        {getAnonymousId(submission.id)}
                      </td>
                      <td className="p-3 text-sm">
                        {submission.paying_or_receiving || "N/A"}
                      </td>
                      <td className="p-3 text-sm font-medium text-red-600">
                        £
                        {(
                          submission.fictitious_arrears_amount || 0
                        ).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm">
                        £
                        {(
                          submission.monthly_payment_demanded || 0
                        ).toLocaleString()}
                      </td>
                      <td className="p-3 text-sm">
                        {submission.impact_severity || "N/A"}/10
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex gap-2">
                          {submission.has_equal_care && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                              50/50
                            </span>
                          )}
                          {submission.child_told_less_money && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                              Manipulation
                            </span>
                          )}
                          {submission.facing_enforcement && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              Enforcement
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
