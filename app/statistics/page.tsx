// app/statistics/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StatisticsService, Statistics } from "@/services/statisticsService";
import { DateDisplay } from "@/utils/dateUtils";

function StatisticsPageContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const supabase = createClient();
  const statsService = StatisticsService.getInstance();

  // Fetch statistics
  const fetchStats = useCallback(
    async (forceRefresh = false) => {
      try {
        setError(null);
        const data = await statsService.getStatistics(forceRefresh);
        setStats(data);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("Failed to load statistics");
      } finally {
        setLoading(false);
      }
    },
    [statsService]
  );

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time subscription if enabled
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel("statistics-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "evidence_submissions",
          filter: "submission_type=eq.evidence_v2",
        },
        () => {
          // Refresh stats on change
          fetchStats(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLive, supabase, fetchStats]);

  // Auto-refresh every 3600 seconds when live
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchStats(true);
    }, 3600000);

    return () => clearInterval(interval);
  }, [isLive, fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Error Loading Statistics
          </h2>
          <p className="text-red-700">{error || "Unable to load statistics"}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats(true);
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Evidence Counter</h1>
        <div className="flex items-center gap-4"></div>
      </div>

      {/* Last updated */}
      <p className="text-sm text-gray-600 mb-4">
        Last updated: <DateDisplay date={lastUpdate} relative />
      </p>
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Submissions
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {stats.total_submissions}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Evidence cases documented
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Fictitious Arrears Total
          </h3>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(stats.total_fictitious_arrears)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Average: {formatCurrency(stats.avg_fictitious_arrears)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            50/50 Care But Paying
          </h3>
          <p className="text-3xl font-bold text-orange-600">
            {stats.equal_care_still_paying}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {formatPercentage(
              stats.equal_care_still_paying,
              stats.paying_parents
            )}{" "}
            of paying parents
          </p>
        </div>
      </div>
      {/* System failures */}
      <div className="bg-red-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-red-900">
          System Failures Documented
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-red-800">Regulation 50 Ignored</h3>
            <div className="mt-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold text-red-700">
                  {stats.regulation_50_rejections}
                </span>
                <span className="text-sm text-red-600">
                  of {stats.regulation_50_attempts} attempts
                </span>
              </div>
              {stats.regulation_50_attempts > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-red-200 rounded-full h-4">
                    <div
                      className="bg-red-600 h-4 rounded-full transition-all duration-500"
                      style={{
                        width: formatPercentage(
                          stats.regulation_50_rejections,
                          stats.regulation_50_attempts
                        ),
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    {formatPercentage(
                      stats.regulation_50_rejections,
                      stats.regulation_50_attempts
                    )}{" "}
                    rejection rate
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-red-800">Wrongful Enforcement</h3>
            <p className="text-2xl font-bold text-red-700 mt-2">
              {stats.wrongful_enforcement}
            </p>
            <p className="text-sm text-red-600">Despite compliance/disputes</p>
          </div>
        </div>
      </div>
      {/* Child impact */}
      <div className="bg-amber-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-amber-900">
          Impact on Children
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-amber-800">
              Psychological Manipulation
            </h3>
            <p className="text-2xl font-bold text-amber-700 mt-2">
              {stats.psychological_manipulation_cases}
            </p>
            <p className="text-sm text-amber-600">
              Children told "less money if you see them"
            </p>
          </div>

          <div>
            <h3 className="font-medium text-amber-800">
              Average Severity Rating
            </h3>
            <div className="mt-2">
              <p className="text-2xl font-bold text-amber-700">
                {stats.avg_impact_severity.toFixed(1)}/10
              </p>
              <div className="w-full bg-amber-200 rounded-full h-4 mt-2">
                <div
                  className="bg-amber-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${stats.avg_impact_severity * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Call to action */}
      <div className="bg-gray-100 rounded-lg p-6 text-center">
        <p className="text-lg mb-4">
          {stats.total_submissions === 0
            ? "Be the first to submit evidence and help expose systemic discrimination"
            : "Together we're building undeniable evidence of systemic failure"}
        </p>
        {user ? (
          <Link
            href="/statement-portal"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Your Evidence
          </Link>
        ) : (
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign In to Submit Evidence
          </Link>
        )}
      </div>
    </div>
  );
}

// Public page - auth context already provided by ClientLayout
export default function StatisticsPage() {
  return <StatisticsPageContent />;
}
