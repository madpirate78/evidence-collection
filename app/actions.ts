// app/actions.ts - uses form-validation-schema
"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  validateFormSubmission,
} from "@/schemas/form-validation-schema";
import {
  ACTIVE_SURVEY_CONFIG,
  type SurveyConfig,
} from "@/config/surveyQuestions";
import { headers } from "next/headers";
import { checkRateLimit, hasAlreadySubmitted } from "@/lib/rate-limiter";
import { StatisticsCache, type Statistics } from "@/lib/statistics-cache";

// Allowed domains for iframe embedding - configurable via ALLOWED_EMBED_ORIGIN env var
function getAllowedEmbedOrigins(): string[] {
  const origin = process.env.ALLOWED_EMBED_ORIGIN;
  if (!origin) return [];
  // Support both the base domain and www subdomain
  return [origin, `www.${origin}`];
}

// Check if request is from an allowed embed origin or embed mode
// Note: For iframe embeds, the Referer header is the iframe's own URL, not the parent.
// CSP frame-ancestors in middleware.ts already restricts which domains can embed,
// so we trust requests that come from embed mode or have a valid referer.
async function isAllowedEmbedRequest(): Promise<boolean> {
  const headersList = await headers();
  const referer = headersList.get("referer");
  if (!referer) return false;

  try {
    const refererUrl = new URL(referer);

    // Check if request is from embed mode (iframe) - CSP frame-ancestors validates the parent
    const isEmbedMode = refererUrl.searchParams.get("embed") === "true";
    if (isEmbedMode) {
      return true;
    }

    // Direct access from allowed domains
    const allowedOrigins = getAllowedEmbedOrigins();
    return allowedOrigins.some(
      (domain) =>
        refererUrl.hostname === domain ||
        refererUrl.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// CSRF verification with error handling
async function verifyCSRF(
  formData: FormData
): Promise<{ valid: boolean; error?: string; skipped?: boolean }> {
  try {
    const token = formData.get("csrf_token") as string;
    const cookieStore = await cookies();
    const storedToken = cookieStore.get("csrf_token")?.value;

    // If no cookie token (embed mode), check if from allowed origin
    if (!storedToken) {
      const isEmbed = await isAllowedEmbedRequest();
      if (isEmbed) {
        return { valid: true, skipped: true };
      }
      return { valid: false, error: "CSRF token missing" };
    }

    if (!token) {
      return { valid: false, error: "CSRF token missing" };
    }

    const isValid = token === storedToken;

    if (!isValid) {
      return { valid: false, error: "CSRF token invalid" };
    }

    return { valid: true };
  } catch (error) {
    // Log error server-side only
    return { valid: false, error: "CSRF verification failed" };
  }
}

// Enhanced evidence submission action - now fully config-driven
export async function submitEvidenceAction(
  formData: FormData,
  config: SurveyConfig = ACTIVE_SURVEY_CONFIG
) {
  try {
    // 0. Rate Limiting
    const headersList = await headers();
    const identifier =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "anonymous";
    const userAgent = headersList.get("user-agent");
    const { allowed, message, blocked_until } = await checkRateLimit(
      identifier,
      "submit_evidence",
      userAgent || null
    );

    if (!allowed) {
      let errorMessage = message || "Too many submissions. Please try again later.";
      if (blocked_until) {
        const blockedDate = new Date(blocked_until);
        const now = new Date();
        const minutesRemaining = Math.ceil((blockedDate.getTime() - now.getTime()) / (1000 * 60));
        errorMessage = `You are temporarily blocked. Please try again in ${minutesRemaining} minute(s).`;
      }
      return {
        error: errorMessage,
        success: false,
        code: "RATE_LIMITED",
      };
    }

    // 0.5. Origin validation - only allow submissions from allowed embed origins
    const isFromAllowedOrigin = await isAllowedEmbedRequest();
    if (!isFromAllowedOrigin) {
      return {
        error: "Submissions are only accepted from the official survey page.",
        success: false,
        code: "INVALID_ORIGIN",
      };
    }

    // 1. CSRF validation (if enabled in config)
    if (config.security.enableCSRFProtection) {
      const csrfCheck = await verifyCSRF(formData);
      if (!csrfCheck.valid) {
        return {
          error:
            csrfCheck.error ||
            "Security validation failed. Please refresh and try again.",
          success: false,
          code: "CSRF_INVALID",
        };
      }
    }

    // 2. Use the universal form submission validator from your schema and CSRF token parameter
    const csrfToken = formData.get("csrf_token") as string;
    const validation = await validateFormSubmission(
      formData,
      config,
      csrfToken
    );

    if (!validation.success) {
      console.error("❌ Validation error:", validation.errors);
      return {
        error:
          validation.error || "Validation failed. Please check your inputs.",
        success: false,
        code: validation.code || "VALIDATION_ERROR",
        fieldErrors: validation.errors,
      };
    }

    // 5. Handle any security warnings (like crisis responses)
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        if (warning.type === "crisis_response") {
          // Log crisis response for monitoring (anonymized)
          console.warn("🚨 Crisis response detected in submission", {
            timestamp: new Date().toISOString(),
            type: warning.type,
            surveyId: config.surveyId,
          });

          // Could trigger support notifications here
          // await notifyCrisisSupport(warning, config);
        }
      });
    }

    // 6. Get the prepared database data
    const submissionData = validation.data;
    if (!submissionData) {
      return {
        error: "Internal error: missing submission data",
        success: false,
        code: "INTERNAL_ERROR",
      };
    }

    // 7. Database insertion using Prisma
    let data;
    try {
      data = await prisma.evidenceSubmission.create({
        data: {
          parentType: submissionData.parent_type,
          childrenAffected: submissionData.children_affected,
          childrenCovered: submissionData.children_covered,
          agedOutChildren: submissionData.aged_out_children ?? 0,
          additionalChildren: submissionData.additional_children ?? 0,
          impactStatement: submissionData.impact_statement,
          consentGiven: submissionData.consent_given,
          evidenceData: submissionData.evidence_data ?? {},
          email: submissionData.email ?? "",
          fullName: submissionData.full_name ?? "",
          submissionType: submissionData.submission_type ?? config.submissionType,
        },
      });
    } catch (error: unknown) {
      console.error("❌ Database insertion error:", error);
      console.error("💾 Data we tried to insert:", submissionData);

      const prismaError = error as { code?: string; message?: string };

      // Enhanced error handling
      if (prismaError.code === "P2002") {
        return {
          error: "Duplicate submission detected.",
          success: false,
          code: "DUPLICATE_SUBMISSION",
        };
      }

      // Log security incident for monitoring
      console.error("🔒 Database security incident:", {
        timestamp: new Date().toISOString(),
        surveyId: config.surveyId,
        error_code: prismaError.code,
        error_message: prismaError.message,
        severity: "high",
      });

      return {
        error: "Failed to save evidence. Please try again.",
        success: false,
        code: "DATABASE_ERROR",
      };
    }

    // 8. Success response with config context
    const warnings = validation.warnings && validation.warnings.length > 0
      ? validation.warnings.map((w) => ({
          type: w.type,
          message: getWarningMessage(w.type, config),
          resources: w.resources,
        }))
      : undefined;

    return {
      success: true as const,
      data: {
        id: data.id.toString(),
        message: "Evidence submitted successfully",
        submission_type: data.submissionType,
        survey_id: config.surveyId,
      },
      ...(warnings && { warnings }),
    };
  } catch (error) {
    console.error("💥 Submission error:", error);

    // Enhanced error logging for security monitoring
    console.error("🔒 Security submission error:", {
      timestamp: new Date().toISOString(),
      surveyId: config.surveyId,
      error: error instanceof Error ? error.message : "Unknown error",
      severity: "critical",
    });

    return {
      error: "An unexpected error occurred. Please try again.",
      success: false,
      code: "INTERNAL_ERROR",
    };
  }
}

// Helper function to get appropriate warning messages
function getWarningMessage(warningType: string, _config: SurveyConfig): string {
  switch (warningType) {
    case "crisis_response":
      return "Thank you for sharing. Support resources have been provided. Your submission helps document the serious impact of system failures.";
    default:
      return "Your submission has been recorded with additional context noted.";
  }
}

// Generic field validation action - works with any survey config
export async function validateFieldAction(
  field: string,
  value: unknown,
  conditionalValue?: string,
  config: SurveyConfig = ACTIVE_SURVEY_CONFIG
) {
  try {
    // Get applicable questions for the conditional value
    const applicableQuestions = conditionalValue
      ? config.conditionalLogic.getApplicableQuestions(conditionalValue)
      : {};

    const questionConfig = applicableQuestions[field];

    if (!questionConfig || !questionConfig.validation) {
      return { valid: false, error: "Unknown field" };
    }

    // Apply sanitization first
    const sanitizedValue = config.validation.sanitizeInput(
      value,
      questionConfig
    );

    // Then validate
    questionConfig.validation.parse(sanitizedValue);

    return { valid: true, sanitizedValue };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.errors[0].message,
      };
    }
    return { valid: false, error: "Validation failed" };
  }
}

// Enhanced form progress logging with config context
export async function logFormProgress(
  _step: number,
  _total: number,
  _config: SurveyConfig = ACTIVE_SURVEY_CONFIG
) {
  return { success: true };
}

// New: Get survey configuration action
export async function getSurveyConfigAction(_surveyId?: string) {
  // In the future, this could load different configs based on surveyId
  // For now, return the active config
  return {
    success: true,
    config: {
      surveyId: ACTIVE_SURVEY_CONFIG.surveyId,
      title: ACTIVE_SURVEY_CONFIG.title,
      description: ACTIVE_SURVEY_CONFIG.description,
      version: ACTIVE_SURVEY_CONFIG.version,
      // Don't expose internal config details to client
    },
  };
}

// New: Admin function to get submission stats by survey type
export async function getSubmissionStatsAction(
  _surveyId?: string,
  config: SurveyConfig = ACTIVE_SURVEY_CONFIG
) {
  try {
    const data = await prisma.evidenceSubmission.findMany({
      where: { submissionType: config.submissionType },
      select: { id: true, createdAt: true, submissionType: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      stats: {
        total: data.length,
        recent: data.slice(0, 10).length,
        surveyId: config.surveyId,
        submissionType: config.submissionType,
      },
    };
  } catch (error) {
    console.error("Stats action error:", error);
    return {
      success: false,
      error: "Statistics temporarily unavailable",
    };
  }
}

// ============================================================================
// STATISTICS SERVER ACTIONS
// ============================================================================

/**
 * Get statistics from server-side cache (replaces StatisticsService)
 */
export async function getStatisticsAction(): Promise<{
  success: boolean;
  data: Statistics;
  lastUpdated: Date;
  cached: boolean;
  source: 'database' | 'fallback';
  error?: string;
}> {
  try {
    
    const cached = await StatisticsCache.get();
    
    return {
      success: true,
      data: cached.data,
      lastUpdated: new Date(cached.lastUpdated),
      cached: true,
      source: cached.source,
    };
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
    
    // Return fallback data on error
    const fallback = StatisticsCache.getFallbackData();
    
    return {
      success: false,
      data: fallback.data,
      lastUpdated: new Date(fallback.lastUpdated),
      cached: false,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update statistics cache from database (admin action)
 */
export async function updateStatisticsCacheAction(): Promise<{
  success: boolean;
  message: string;
  data?: Statistics;
  error?: string;
}> {
  try {
    
    const result = await StatisticsCache.updateFromDatabase();
    
    if (result.success) {
      return {
        success: true,
        message: 'Statistics cache updated successfully',
        data: result.data,
      };
    } else {
      return {
        success: false,
        message: 'Failed to update statistics cache',
        error: result.error,
      };
    }
  } catch (error) {
    console.error('❌ Failed to update statistics cache:', error);
    
    return {
      success: false,
      message: 'Failed to update statistics cache',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get cache metadata (for monitoring/debugging)
 */
export async function getStatisticsCacheInfoAction(): Promise<{
  exists: boolean;
  lastUpdated: Date;
  source: 'database' | 'fallback';
  version: string;
}> {
  try {
    const exists = await StatisticsCache.exists();
    
    if (exists) {
      const cached = await StatisticsCache.get();
      return {
        exists: true,
        lastUpdated: new Date(cached.lastUpdated),
        source: cached.source,
        version: cached.version,
      };
    } else {
      return {
        exists: false,
        lastUpdated: new Date(),
        source: 'fallback',
        version: '1.0',
      };
    }
  } catch (error) {
    console.error('❌ Failed to get cache info:', error);
    
    return {
      exists: false,
      lastUpdated: new Date(),
      source: 'fallback',
      version: '1.0',
    };
  }
}

// Check if current IP has already submitted
export async function checkIfAlreadySubmitted(): Promise<boolean> {
  try {
    const headersList = await headers();
    const identifier =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "anonymous";

    return await hasAlreadySubmitted(identifier, "submit_evidence");
  } catch (error) {
    console.error("checkIfAlreadySubmitted error:", error);
    return false; // Fail open - show form if error
  }
}
