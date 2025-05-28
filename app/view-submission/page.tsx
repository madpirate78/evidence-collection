// app/view-submission/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { DateDisplay } from "@/utils/dateUtils";
import { clientSafeId } from "@/utils/secureId";

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

// Loading component
function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading submission...</p>
      </div>
    </div>
  );
}

// Main content component that uses search params
function ViewSubmissionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const encodedId = searchParams.get("id");

  useEffect(() => {
    if (!user || authLoading || !encodedId) return;

    const fetchSubmission = async () => {
      try {
        setError(null);

        // Decode the ID
        let submissionId: number;
        try {
          submissionId = clientSafeId.decode(encodedId);
        } catch (err) {
          throw new Error("Invalid submission ID");
        }

        // Fetch submission
        const { data, error } = await supabase
          .from("evidence_submissions")
          .select("*")
          .eq("id", submissionId)
          .eq("user_id", user.id) // Security: ensure user owns this submission
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            throw new Error("Submission not found or access denied");
          }
          throw error;
        }

        setSubmission(data);
      } catch (err) {
        console.error("Error fetching submission:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load submission"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [user, authLoading, encodedId, supabase]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (error || !submission) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          {error ? "Error" : "Submission Not Found"}
        </h2>
        <p className="mb-6 text-gray-700">
          {error || "The submission you're looking for could not be found."}
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Evidence Submission Details</h1>
          <p className="text-sm text-gray-600 mt-1">
            Submitted <DateDisplay date={submission.created_at} relative />
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Submission Type</p>
                <p className="font-medium">Evidence</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Parent Type</p>
                <p className="font-medium capitalize">
                  {submission.paying_or_receiving || "Not specified"}
                </p>
              </div>
              {submission.case_number && (
                <div>
                  <p className="text-sm text-gray-600">Case Number</p>
                  <p className="font-medium">{submission.case_number}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Children Affected</p>
                <p className="font-medium">
                  {submission.children_affected || 0}
                </p>
              </div>
            </div>
          </section>

          {/* Financial Details */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Financial Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Shared Care Nights/Week</p>
                <p className="font-medium">
                  {submission.shared_care_nights || 0}
                  {(submission.shared_care_nights || 0) >= 3.5 && (
                    <span className="text-green-600 text-sm ml-2">
                      (Qualifies for Regulation 50)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Child Benefit Holder</p>
                <p className="font-medium capitalize">
                  {submission.child_benefit_holder?.replace("_", " ") ||
                    "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Monthly Payment Demanded
                </p>
                <p className="font-medium text-red-600">
                  {formatCurrency(submission.monthly_payment_demanded || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Fictitious Arrears Claimed
                </p>
                <p className="font-medium text-red-600">
                  {formatCurrency(submission.fictitious_arrears_amount || 0)}
                </p>
              </div>
            </div>
          </section>

          {/* Issues Reported */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Issues Reported</h2>
            <div className="space-y-2">
              {submission.has_equal_care && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span>Has 50/50 shared care but still pays maintenance</span>
                </div>
              )}
              {submission.facing_enforcement && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span>
                    Facing enforcement action (DEO, liability order, etc)
                  </span>
                </div>
              )}
              {submission.has_fictitious_arrears && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span>CMS claims arrears that don't exist</span>
                </div>
              )}
              {submission.regulation_50_attempted && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">✓</span>
                  <span>
                    Regulation 50 application attempted -
                    <span
                      className={`ml-1 font-medium ${
                        submission.regulation_50_outcome === "rejected"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {submission.regulation_50_outcome || "outcome unknown"}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Child Impact */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Impact on Children</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Overall Impact Severity
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-600 h-3 rounded-full"
                      style={{
                        width: `${(submission.impact_severity || 0) * 10}%`,
                      }}
                    />
                  </div>
                  <span className="font-medium">
                    {submission.impact_severity || 0}/10
                  </span>
                </div>
              </div>

              {(submission.child_told_less_money ||
                submission.child_lost_bedroom ||
                submission.child_anxiety_money) && (
                <div className="space-y-2 mt-3">
                  {submission.child_told_less_money && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-600">⚠</span>
                      <span>
                        Child told they'll "get less money" if they see parent
                        more
                      </span>
                    </div>
                  )}
                  {submission.child_lost_bedroom && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-600">⚠</span>
                      <span>Child lost bedroom due to financial pressure</span>
                    </div>
                  )}
                  {submission.child_anxiety_money && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-600">⚠</span>
                      <span>Child shows anxiety about money/payments</span>
                    </div>
                  )}
                </div>
              )}

              {submission.school_attendance_before !== undefined &&
                submission.school_attendance_after !== undefined && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">School Attendance</p>
                    <p className="text-sm">
                      Before CMS: {submission.school_attendance_before}% → After
                      CMS: {submission.school_attendance_after}%
                      {submission.school_attendance_before >
                        submission.school_attendance_after && (
                        <span className="text-red-600 font-medium ml-2">
                          (↓{" "}
                          {submission.school_attendance_before -
                            submission.school_attendance_after}
                          %)
                        </span>
                      )}
                    </p>
                  </div>
                )}
            </div>
          </section>

          {/* Written Statements */}
          {(submission.description || submission.child_impact_statement) && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Written Statements</h2>

              {submission.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Description of Situation
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {submission.description}
                  </div>
                </div>
              )}

              {submission.child_impact_statement && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Impact on Children
                  </h3>
                  <div className="bg-amber-50 p-4 rounded-lg whitespace-pre-wrap text-sm">
                    {submission.child_impact_statement}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Contact Information */}
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-3">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{submission.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{submission.email}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Print/Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function ViewSubmissionPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ViewSubmissionContent />
    </Suspense>
  );
}
