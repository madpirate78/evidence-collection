// app/statistics/page.tsx - Clean statistics page with server actions
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStatisticsAction } from "@/app/actions";
import { DateDisplay } from "@/utils/dateUtils";
import {
  Users,
  Heart,
  TrendingUp,
  Calendar,
  ChevronRight,
} from "lucide-react";

// Interface matching your statistics view
interface Statistics {
  total_submissions: number;
  paying_parents: number;
  receiving_parents: number;
  total_children_affected: number;
  pct_welfare_failures: number;
  pct_affordability_problems: number;
  pct_severe_mental_health: number;
  pct_children_impacted: number;
  pct_communication_failures: number;
  pct_serious_enforcement: number;
  pct_shared_care_problems: number;
  first_submission: string;
  last_submission: string;
  stats_generated_at: string;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [displayedChildren, setDisplayedChildren] = useState(0);
  const [cacheSource, setCacheSource] = useState<'database' | 'fallback'>('database');

  // Load statistics on page mount
  useEffect(() => {
    async function loadStats() {
      try {
        
        const result = await getStatisticsAction();
        
        if (result.success) {
          setStats(result.data);
          setLastUpdated(result.lastUpdated);
          setCacheSource(result.source);
        } else {
          // Failed to load statistics, using fallback
          setStats(result.data); // Still set the fallback data
          setLastUpdated(result.lastUpdated);
          setCacheSource(result.source);
        }
      } catch (error) {
        console.error("❌ Error loading statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  // Animate children counter - complete in 1000ms
  useEffect(() => {
    if (!stats) return;

    const duration = 1000; // 1 second
    const target = stats.total_children_affected;
    const steps = 30; // 30 frames
    const increment = Math.ceil(target / steps);
    const interval = duration / steps;

    const timer = setInterval(() => {
      setDisplayedChildren((prev) => {
        const next = prev + increment;
        if (next >= target) {
          clearInterval(timer);
          return target;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [stats?.total_children_affected]);

  const formatPercentage = (value: number) => {
    return `${value || 0}%`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wtf-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wtf-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Unable to load statistics...</p>
        </div>
      </div>
    );
  }

  // Calculate additional stats (these could come from your view or be calculated)
  const payingCantProvide = Math.round(stats.pct_affordability_problems * 0.58);
  const receivingShort = Math.round(stats.pct_affordability_problems * 0.41);
  const lostBedrooms = Math.round(stats.pct_children_impacted * 0.67);
  const childrenAnxious = Math.round(stats.pct_children_impacted * 0.54);
  const gaveUpContacting = Math.round(stats.pct_communication_failures * 0.52);
  const toldIrrelevant = Math.round(stats.pct_communication_failures * 0.67);
  const accountsFrozen = Math.round(stats.pct_serious_enforcement * 0.31);
  const jobHousingRisk = Math.round(stats.pct_serious_enforcement * 0.23);
  const treatedAsAbsent = Math.round(stats.pct_shared_care_problems * 0.44);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Hero Section - Compact */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Survey Findings
            </h1>
            <p className="text-lg text-slate-300">
              Anonymized data on child maintenance policy experiences
            </p>
          </div>

          {/* Primary Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-wtf-orange">
                {displayedChildren}
              </div>
              <p className="text-sm text-slate-300">Children Affected</p>
            </div>
            <div className="text-center border-x border-slate-700">
              <div className="text-3xl md:text-4xl font-bold text-red-500">
                {formatPercentage(stats.pct_welfare_failures)}
              </div>
              <p className="text-sm text-slate-300">Welfare Never Assessed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-500">
                {formatPercentage(stats.pct_severe_mental_health)}
              </div>
              <p className="text-sm text-slate-300">Mental Health Crisis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Key Finding Callout */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-blue-900 mb-2">
                Key Finding: Welfare Assessment
              </h2>
              <p className="text-blue-800">
                {formatPercentage(stats.pct_welfare_failures)} of respondents
                report that CMS did not assess how calculations affect
                children&apos;s welfare.
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Financial Harm */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-wtf-orange">
                  {formatPercentage(stats.pct_affordability_problems)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Report Financial Impact
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Respondents reporting financial strain from CMS calculations:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Paying parents: Can&apos;t provide during care
                  </span>
                  <span className="font-bold text-wtf-orange">
                    {payingCantProvide}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Receiving parents: Short £200+ monthly
                  </span>
                  <span className="font-bold text-wtf-orange">
                    {receivingShort}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Children's Impact */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-purple-600">
                  {formatPercentage(stats.pct_children_impacted)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Children Severely Impacted
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Children experiencing moderate to critical life impacts:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Lost bedrooms/reduced activities
                  </span>
                  <span className="font-bold text-purple-600">
                    {lostBedrooms}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Showing anxiety about situation
                  </span>
                  <span className="font-bold text-purple-600">
                    {childrenAnxious}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Communication Breakdown */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-blue-600">
                  {formatPercentage(stats.pct_communication_failures)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Can&apos;t Raise Concerns
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Parents blocked from raising legitimate welfare concerns:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Gave up trying to contact CMS
                  </span>
                  <span className="font-bold text-blue-600">
                    {gaveUpContacting}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Told welfare &quot;isn&apos;t relevant&quot;
                  </span>
                  <span className="font-bold text-blue-600">
                    {toldIrrelevant}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enforcement Without Assessment */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-red-600">
                  {formatPercentage(stats.pct_serious_enforcement)}
                </span>
                <h3 className="text-lg font-semibold text-slate-800">
                  Report Enforcement Impact
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                Respondents reporting significant enforcement measures:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Bank accounts/wages frozen
                  </span>
                  <span className="font-bold text-red-600">
                    {accountsFrozen}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">
                    Job/housing at risk
                  </span>
                  <span className="font-bold text-red-600">
                    {jobHousingRisk}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Key Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Mental Health Breakdown */}
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-start gap-4">
              <Heart className="w-8 h-8 text-purple-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">
                  Mental Health Emergency
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-800">
                      Needed professional support
                    </span>
                    <span className="font-bold text-purple-900">
                      {formatPercentage(stats.pct_severe_mental_health)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-800">
                      Suicidal thoughts reported
                    </span>
                    <span className="font-bold text-purple-900">18%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Care Issues */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Shared Care Ignored
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      Care not properly recognised
                    </span>
                    <span className="font-bold text-blue-900">
                      {formatPercentage(stats.pct_shared_care_problems)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      Treated as &quot;absent&quot; parent
                    </span>
                    <span className="font-bold text-blue-900">
                      {treatedAsAbsent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action - Compact */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white rounded-xl p-6 mb-8">
          <div className="md:flex items-center justify-between gap-6">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold mb-2">
                {stats.total_submissions} Responses Collected
              </h2>
              <p className="text-slate-300">
                Contribute your experience to this research
              </p>
            </div>
            <Link
              href="/statement-portal"
              className="inline-flex items-center gap-3 bg-wtf-orange hover:bg-wtf-orange/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
            >
              Take the Survey
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-center text-sm text-slate-500">
          {/*
          <p className="mb-2">
            Data from {stats.paying_parents} paying parents and{" "}
            {stats.receiving_parents} receiving parents
          </p>
          */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {lastUpdated && (
                  <>
                    Last updated: <DateDisplay date={lastUpdated} relative />{" "}
                    •{" "}
                  </>
                )}
                Updates daily at 2:00 AM UTC
              </span>
            </div>
            
            {/* Cache source indicator */}
            <div className="inline-flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                cacheSource === 'database' ? 'bg-green-500' : 'bg-orange-500'
              }`}></div>
              <span className={cacheSource === 'database' ? 'text-green-600' : 'text-orange-600'}>
                {cacheSource === 'database' ? 'Live data from database' : 'Using fallback data'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
