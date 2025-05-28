// app/api/submit-evidence/route.ts - API route with Zod validation
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  evidenceSchema,
  transformEvidenceForDatabase,
} from "@/schemas/evidence-schema";
import { z } from "zod";
import { cookies } from "next/headers";

// Since evidenceSchema uses .refine() and is a ZodEffects, we can't use .merge()
// Instead, we'll extend the schema
const apiRequestSchema = evidenceSchema.and(
  z.object({
    csrf_token: z.string().min(1, "CSRF token required"),
  })
);

// Helper function to verify CSRF token
async function verifyCSRF(token: string): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get("csrf_token")?.value;
  const clientToken = cookieStore.get("csrf_token_client")?.value;

  return token === storedToken || token === clientToken;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Preprocess: Convert null values back to empty strings for validation
    const preprocessedBody = Object.entries(body).reduce(
      (acc, [key, value]) => {
        // Convert null to empty string for string fields
        if (value === null && key !== "actual_arrears_amount") {
          acc[key] = "";
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as any
    );

    // Verify CSRF token first
    const csrfToken = body.csrf_token || request.headers.get("X-CSRF-Token");
    if (!csrfToken || !(await verifyCSRF(csrfToken))) {
      return NextResponse.json(
        {
          error: "Invalid security token",
          code: "CSRF_TOKEN_INVALID",
        },
        { status: 403 }
      );
    }

    // Validate the request data
    let validatedData;
    try {
      validatedData = apiRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.flatten().fieldErrors,
            code: "VALIDATION_ERROR",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 }
      );
    }

    // Ensure the user_id matches the authenticated user (security check)
    if (validatedData.user_id && validatedData.user_id !== user.id) {
      return NextResponse.json(
        {
          error: "User ID mismatch",
          code: "USER_MISMATCH",
        },
        { status: 403 }
      );
    }

    // Remove csrf_token from validated data before processing
    const { csrf_token: _, ...dataWithoutCsrf } = validatedData;

    // Add user information to the validated data
    const dataWithUser = {
      ...dataWithoutCsrf,
      user_id: user.id,
      email: user.email || validatedData.email || "",
    };

    // Transform for database insertion
    const submissionData = transformEvidenceForDatabase(dataWithUser);

    // Rate limiting check
    // This would integrate with your rate limiter
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from("evidence_submissions")
      .insert(submissionData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insertion error:", insertError);
      console.error("Error details:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      // Log the data we tried to insert (without sensitive info)
      console.error("Attempted to insert:", {
        dataWithUser,
        description: "[REDACTED]",
        child_impact_statement: "[REDACTED]",
        impact_statement: "[REDACTED]",
      });

      // Check for specific database errors
      if (insertError.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          {
            error: "Duplicate submission detected",
            code: "DUPLICATE_SUBMISSION",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to save evidence submission",
          code: "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }

    // Log successful submission for monitoring
    console.log(
      `Evidence submission successful: ID ${insertedData.id}, User: ${user.id}, IP: ${clientIP}`
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: insertedData.id,
        created_at: insertedData.created_at,
        submission_type: insertedData.submission_type,
        message: "Evidence submitted successfully",
      },
    });
  } catch (error) {
    console.error("API route error:", error);

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

/*// Handle OPTIONS for CORS (if needed)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    },
  });
}*/

// Reject other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
