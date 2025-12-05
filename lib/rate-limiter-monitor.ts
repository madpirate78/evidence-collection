import prisma from "./prisma";

interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  uniqueIPs: number;
  averageResponseTime: number;
  topBlockedIPs: Array<{ ip: string; attempts: number; last_attempt: string }>;
}

interface RateLimitActivity {
  timestamp: string;
  ip: string;
  action: string;
  allowed: boolean;
  attempts: number;
  user_agent?: string;
}

export class RateLimitMonitor {
  private static performanceMetrics: Map<string, number[]> = new Map();

  /**
   * Record performance metrics for rate limit checks
   */
  static recordPerformance(identifier: string, duration: number) {
    const key = `perf_${identifier}`;
    const metrics = this.performanceMetrics.get(key) || [];
    metrics.push(duration);

    // Keep only last 100 measurements per IP
    if (metrics.length > 100) {
      metrics.shift();
    }

    this.performanceMetrics.set(key, metrics);
  }

  /**
   * Get performance statistics for an IP
   */
  static getPerformanceStats(identifier: string) {
    const key = `perf_${identifier}`;
    const metrics = this.performanceMetrics.get(key) || [];

    if (metrics.length === 0) {
      return null;
    }

    const sum = metrics.reduce((a, b) => a + b, 0);
    const avg = sum / metrics.length;
    const min = Math.min(...metrics);
    const max = Math.max(...metrics);

    return {
      average: Math.round(avg * 100) / 100,
      minimum: min,
      maximum: max,
      sampleSize: metrics.length,
    };
  }

  /**
   * Get current rate limit metrics from database
   */
  static async getMetrics(
    timeframe: "hour" | "day" | "week" = "hour"
  ): Promise<RateLimitMetrics> {
    const cutoff = new Date(this.getTimeframeCutoff(timeframe));

    try {
      // Get rate limit statistics using Prisma
      const [totalRequests, violations, uniqueIdentifiers] = await Promise.all([
        prisma.rateLimit.count({
          where: { createdAt: { gte: cutoff } },
        }),
        prisma.rateLimitViolation.findMany({
          where: { createdAt: { gte: cutoff } },
          select: { identifier: true, createdAt: true },
        }),
        prisma.rateLimit.groupBy({
          by: ["identifier"],
          where: { createdAt: { gte: cutoff } },
        }),
      ]);

      const blockedRequests = violations.length;
      const allowedRequests = totalRequests;
      const uniqueIPs = uniqueIdentifiers.length;

      return {
        totalRequests: totalRequests + blockedRequests,
        allowedRequests,
        blockedRequests,
        uniqueIPs,
        averageResponseTime: this.getAverageResponseTime(),
        topBlockedIPs: this.processBlockedIPs(violations),
      };
    } catch (error) {
      console.error("Error in getMetrics:", error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Process blocked IPs data to group by identifier
   */
  private static processBlockedIPs(
    data: Array<{ identifier: string; createdAt: Date }>
  ): Array<{ ip: string; attempts: number; last_attempt: string }> {
    const grouped = data.reduce(
      (acc: Record<string, { attempts: number; last_attempt: Date }>, item) => {
        const ip = item.identifier;
        if (!acc[ip]) {
          acc[ip] = { attempts: 0, last_attempt: item.createdAt };
        }
        acc[ip].attempts++;
        if (item.createdAt > acc[ip].last_attempt) {
          acc[ip].last_attempt = item.createdAt;
        }
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .map(([ip, data]) => ({
        ip,
        attempts: data.attempts,
        last_attempt: data.last_attempt.toISOString(),
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 5);
  }

  /**
   * Get recent rate limit activity
   */
  static async getRecentActivity(limit: number = 50): Promise<RateLimitActivity[]> {
    try {
      const [rateLimits, violations] = await Promise.all([
        prisma.rateLimit.findMany({
          select: {
            createdAt: true,
            identifier: true,
            action: true,
            userAgent: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
        prisma.rateLimitViolation.findMany({
          select: {
            createdAt: true,
            identifier: true,
            action: true,
            userAgent: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      ]);

      // Combine and sort all activity
      const allActivity = [
        ...rateLimits.map((item) => ({
          timestamp: item.createdAt.toISOString(),
          ip: item.identifier,
          action: item.action,
          allowed: true,
          attempts: 1,
          user_agent: item.userAgent ?? undefined,
        })),
        ...violations.map((item) => ({
          timestamp: item.createdAt.toISOString(),
          ip: item.identifier,
          action: item.action,
          allowed: false,
          attempts: 1,
          user_agent: item.userAgent ?? undefined,
        })),
      ];

      return allActivity
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);
    } catch (error) {
      console.error("Error in getRecentActivity:", error);
      return [];
    }
  }

  /**
   * Check if an IP is currently blocked
   */
  static async isBlocked(identifier: string): Promise<boolean> {
    try {
      const block = await prisma.rateLimitBlock.findFirst({
        where: {
          identifier,
          blockedUntil: { gte: new Date() },
        },
        select: { blockedUntil: true },
      });

      return block !== null;
    } catch (error) {
      console.error("Error checking block status:", error);
      return false;
    }
  }

  /**
   * Get status for multiple IPs
   */
  static async getIPStatuses(identifiers: string[]) {
    const results = await Promise.all(
      identifiers.map(async (ip) => ({
        ip,
        blocked: await this.isBlocked(ip),
        performance: this.getPerformanceStats(ip),
      }))
    );

    return results;
  }

  private static getDefaultMetrics(): RateLimitMetrics {
    return {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      uniqueIPs: 0,
      averageResponseTime: 0,
      topBlockedIPs: [],
    };
  }

  private static getTimeframeCutoff(
    timeframe: "hour" | "day" | "week"
  ): string {
    const now = new Date();
    switch (timeframe) {
      case "hour":
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    }
  }

  private static getAverageResponseTime(): number {
    const allMetrics = Array.from(this.performanceMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;

    const sum = allMetrics.reduce((a, b) => a + b, 0);
    return Math.round((sum / allMetrics.length) * 100) / 100;
  }
}

// Enhanced rate limiter with monitoring
export async function checkRateLimitWithMonitoring(
  identifier: string,
  action: string = "submit_form",
  userAgent: string | null = null
) {
  const startTime = Date.now();

  try {
    const { checkRateLimit } = await import("./rate-limiter");
    const result = await checkRateLimit(identifier, action, userAgent);

    const duration = Date.now() - startTime;
    RateLimitMonitor.recordPerformance(identifier, duration);

    return {
      ...result,
      performance: {
        responseTime: duration,
        stats: RateLimitMonitor.getPerformanceStats(identifier),
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    RateLimitMonitor.recordPerformance(identifier, duration);
    throw error;
  }
}
