// services/statisticsService.ts
import { createClient } from "@/utils/supabase/client";

export interface Statistics {
  total_submissions: number;
  paying_parents: number;
  equal_care_still_paying: number;
  total_fictitious_arrears: number;
  avg_fictitious_arrears: number;
  regulation_50_attempts: number;
  regulation_50_rejections: number;
  psychological_manipulation_cases: number;
  wrongful_enforcement: number;
  avg_impact_severity: number;
  last_updated: string;
}

/**
 * Service for fetching aggregated statistics efficiently
 */
export class StatisticsService {
  private static instance: StatisticsService;
  private supabase = createClient();
  private cache: Statistics | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): StatisticsService {
    if (!this.instance) {
      this.instance = new StatisticsService();
    }
    return this.instance;
  }

  /**
   * Get statistics with caching
   */
  async getStatistics(forceRefresh = false): Promise<Statistics> {
    const now = Date.now();

    // Return cached data if valid
    if (
      !forceRefresh &&
      this.cache &&
      now - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.cache;
    }

    try {
      // First try to use the database view if it exists
      const { data: viewData, error: viewError } = await this.supabase
        .from("submission_statistics_v2")
        .select("*")
        .single();

      if (!viewError && viewData) {
        const stats: Statistics = {
          ...viewData,
          last_updated: new Date().toISOString(),
        };
        this.cache = stats;
        this.cacheTimestamp = now;
        return stats;
      }

      // If view doesn't exist, use RPC for aggregated stats
      const { data, error } = await this.supabase.rpc(
        "get_submission_statistics"
      );

      if (error) {
        // Fallback to manual aggregation if RPC doesn't exist
        return this.calculateStatisticsManually();
      }

      const stats: Statistics = {
        ...data,
        last_updated: new Date().toISOString(),
      };
      this.cache = stats;
      this.cacheTimestamp = now;
      return stats;
    } catch (error) {
      console.error("Error fetching statistics:", error);
      // Return empty stats on error
      return this.getEmptyStatistics();
    }
  }

  /**
   * Manual calculation as last resort (less efficient)
   */
  private async calculateStatisticsManually(): Promise<Statistics> {
    const { data, error } = await this.supabase
      .from("evidence_submissions")
      .select("*")
      .eq("submission_type", "evidence_v2");

    if (error || !data) {
      return this.getEmptyStatistics();
    }

    const stats: Statistics = {
      total_submissions: data.length,
      paying_parents: data.filter((s) => s.paying_or_receiving === "paying")
        .length,
      equal_care_still_paying: data.filter(
        (s) => s.has_equal_care && s.monthly_payment_demanded > 0
      ).length,
      total_fictitious_arrears: data.reduce(
        (sum, s) => sum + (s.fictitious_arrears_amount || 0),
        0
      ),
      avg_fictitious_arrears: 0,
      regulation_50_attempts: data.filter((s) => s.regulation_50_attempted)
        .length,
      regulation_50_rejections: data.filter(
        (s) => s.regulation_50_outcome === "rejected"
      ).length,
      psychological_manipulation_cases: data.filter(
        (s) => s.child_told_less_money
      ).length,
      wrongful_enforcement: data.filter((s) => s.facing_enforcement).length,
      avg_impact_severity: 0,
      last_updated: new Date().toISOString(),
    };

    // Calculate averages
    const arrearsCount = data.filter(
      (s) => s.fictitious_arrears_amount > 0
    ).length;
    if (arrearsCount > 0) {
      stats.avg_fictitious_arrears =
        stats.total_fictitious_arrears / arrearsCount;
    }

    const severityCount = data.filter((s) => s.impact_severity).length;
    if (severityCount > 0) {
      stats.avg_impact_severity =
        data.reduce((sum, s) => sum + (s.impact_severity || 0), 0) /
        severityCount;
    }

    this.cache = stats;
    this.cacheTimestamp = Date.now();
    return stats;
  }

  /**
   * Get empty statistics object
   */
  private getEmptyStatistics(): Statistics {
    return {
      total_submissions: 0,
      paying_parents: 0,
      equal_care_still_paying: 0,
      total_fictitious_arrears: 0,
      avg_fictitious_arrears: 0,
      regulation_50_attempts: 0,
      regulation_50_rejections: 0,
      psychological_manipulation_cases: 0,
      wrongful_enforcement: 0,
      avg_impact_severity: 0,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
