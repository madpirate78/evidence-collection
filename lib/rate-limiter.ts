import prisma from "./prisma";

interface RateLimitResult {
  allowed: boolean;
  current_attempts: number;
  max_attempts: number;
  remaining_attempts: number;
  window_minutes: number;
  retry_after_seconds?: number;
  retry_after_minutes?: number;
  message?: string;
  blocked_until?: string;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 1,
  windowMinutes: 4320, // 3 days
};

export async function checkRateLimit(
  identifier: string,
  action: string = "submit_form",
  userAgent: string | null = null,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const { maxAttempts, windowMinutes } = { ...DEFAULT_CONFIG, ...config };

  try {
    // 1. Check for active block
    const activeBlock = await prisma.rateLimitBlock.findFirst({
      where: {
        identifier,
        blockedUntil: { gt: new Date() },
      },
    });

    if (activeBlock) {
      const retryAfterSeconds = Math.max(
        0,
        Math.floor((activeBlock.blockedUntil.getTime() - Date.now()) / 1000)
      );
      return {
        allowed: false,
        current_attempts: maxAttempts,
        max_attempts: maxAttempts,
        remaining_attempts: 0,
        window_minutes: windowMinutes,
        retry_after_seconds: retryAfterSeconds,
        retry_after_minutes: Math.round((retryAfterSeconds / 60) * 10) / 10,
        blocked_until: activeBlock.blockedUntil.toISOString(),
        message: `You are temporarily blocked. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      };
    }

    // 2. Count recent attempts within window
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recentAttempts = await prisma.rateLimit.findMany({
      where: {
        identifier,
        action,
        createdAt: { gt: windowStart },
      },
      orderBy: { createdAt: "asc" },
    });

    const count = recentAttempts.length;
    const oldestAttempt = recentAttempts[0]?.createdAt;

    // 3. Under limit - record attempt and allow
    if (count < maxAttempts) {
      await prisma.rateLimit.create({
        data: { identifier, action, userAgent },
      });

      return {
        allowed: true,
        current_attempts: count + 1,
        max_attempts: maxAttempts,
        remaining_attempts: maxAttempts - (count + 1),
        window_minutes: windowMinutes,
      };
    }

    // 4. Over limit - log violation and block
    const retryAfterSeconds = oldestAttempt
      ? Math.max(
          0,
          Math.floor(
            (oldestAttempt.getTime() + windowMinutes * 60 * 1000 - Date.now()) /
              1000
          )
        )
      : windowMinutes * 60;

    // Use transaction for atomic violation logging and blocking
    await prisma.$transaction([
      prisma.rateLimitViolation.create({
        data: {
          identifier,
          action,
          userAgent,
          attemptCount: count,
          metadata: {
            window_minutes: windowMinutes,
            max_attempts: maxAttempts,
            retry_after_seconds: retryAfterSeconds,
            user_agent: userAgent,
          },
        },
      }),
      prisma.rateLimitBlock.upsert({
        where: {
          identifier_userAgent: {
            identifier,
            userAgent: userAgent ?? "",
          },
        },
        update: {
          blockedUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          reason: "Too many requests",
          createdAt: new Date(),
        },
        create: {
          identifier,
          userAgent,
          blockedUntil: new Date(Date.now() + 60 * 60 * 1000),
          reason: "Too many requests",
        },
      }),
    ]);

    return {
      allowed: false,
      current_attempts: count,
      max_attempts: maxAttempts,
      remaining_attempts: 0,
      window_minutes: windowMinutes,
      retry_after_seconds: retryAfterSeconds,
      retry_after_minutes: Math.round((retryAfterSeconds / 60) * 10) / 10,
      message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
    };
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail open - allow if system error
    return {
      allowed: true,
      current_attempts: 0,
      max_attempts: maxAttempts,
      remaining_attempts: maxAttempts,
      window_minutes: windowMinutes,
    };
  }
}

// Get rate limit status without incrementing
export async function getRateLimitStatus(
  identifier: string,
  action: string = "submit_form"
): Promise<RateLimitResult | null> {
  try {
    const windowMinutes = DEFAULT_CONFIG.windowMinutes;
    const maxAttempts = DEFAULT_CONFIG.maxAttempts;
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await prisma.rateLimit.count({
      where: {
        identifier,
        action,
        createdAt: { gt: windowStart },
      },
    });

    return {
      allowed: count < maxAttempts,
      current_attempts: count,
      max_attempts: maxAttempts,
      remaining_attempts: Math.max(0, maxAttempts - count),
      window_minutes: windowMinutes,
    };
  } catch (error) {
    console.error("Rate limit status error:", error);
    return null;
  }
}

// Check if IP has already submitted (without incrementing counter)
export async function hasAlreadySubmitted(
  identifier: string,
  action: string = "submit_evidence"
): Promise<boolean> {
  try {
    const windowMinutes = DEFAULT_CONFIG.windowMinutes;
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const count = await prisma.rateLimit.count({
      where: {
        identifier,
        action,
        createdAt: { gt: windowStart },
      },
    });

    return count > 0;
  } catch (error) {
    console.error("hasAlreadySubmitted error:", error);
    return false; // Fail open - show form if error
  }
}

// Cleanup old rate limit records (older than 7 days)
export async function cleanupOldRateLimitRecords(): Promise<{
  deleted: number;
  error?: string;
}> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.rateLimit.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
      },
    });

    return { deleted: result.count };
  } catch (error) {
    console.error("Cleanup error:", error);
    return { deleted: 0, error: String(error) };
  }
}
