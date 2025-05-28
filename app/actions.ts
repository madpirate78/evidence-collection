// app/actions.ts - Server actions with Zod validation
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  evidenceSchema,
  evidenceSchemaBase,
  transformEvidenceForDatabase,
} from "@/schemas/evidence-schema";

// Schema for authentication actions
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  redirectTo: z.string().optional(),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// CSRF verification helper
async function verifyCSRF(formData: FormData): Promise<boolean> {
  const token = formData.get("csrf_token") as string;
  const cookieStore = await cookies();
  const storedToken = cookieStore.get("csrf_token")?.value;
  const clientToken = cookieStore.get("csrf_token_client")?.value;

  return token === storedToken || token === clientToken;
}

// Helper to extract form data with proper typing
function extractFormData<T>(formData: FormData, schema: z.ZodSchema<T>): T {
  const data: Record<string, any> = {};

  for (const [key, value] of formData.entries()) {
    // Skip files for now
    if (value instanceof File) continue;

    // Handle multiple values for the same key (checkboxes, etc.)
    if (data[key]) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  }

  // Convert string values to appropriate types
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (typeof value === "string") {
      // Try to convert numbers
      if (/^\d+(\.\d+)?$/.test(value)) {
        data[key] = parseFloat(value);
      }
      // Convert boolean strings
      else if (value === "true") {
        data[key] = true;
      } else if (value === "false") {
        data[key] = false;
      }
      // Convert empty strings to undefined for optional fields
      else if (value === "") {
        data[key] = undefined;
      }
    }
  });

  return schema.parse(data);
}

export async function signInAction(formData: FormData) {
  // CSRF check
  if (!(await verifyCSRF(formData))) {
    return redirect(
      "/sign-in?error=Invalid security token. Please refresh and try again."
    );
  }

  // Validate input data
  let validatedData;
  try {
    validatedData = extractFormData(formData, signInSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return redirect(
        `/sign-in?error=${encodeURIComponent(firstError.message)}`
      );
    }
    return redirect("/sign-in?error=Invalid form data");
  }

  const { email, password, redirectTo } = validatedData;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Don't expose detailed auth errors to prevent enumeration attacks
    return redirect("/sign-in?error=Invalid credentials");
  }

  // Ensure we have a valid session before redirecting
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/sign-in?error=Session creation failed");
  }

  // Clear any stale auth state
  revalidatePath("/", "layout");

  // Redirect with session confirmed
  const destination =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
  return redirect(destination);
}

export async function signUpAction(formData: FormData) {
  // CSRF verification
  if (!(await verifyCSRF(formData))) {
    return redirect(
      "/sign-up?error=Invalid security token. Please refresh and try again."
    );
  }

  // Validate input data
  let validatedData;
  try {
    validatedData = extractFormData(formData, signUpSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return redirect(
        `/sign-up?error=${encodeURIComponent(firstError.message)}`
      );
    }
    return redirect("/sign-up?error=Invalid form data");
  }

  const { email, password } = validatedData;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    // Don't expose detailed errors
    return redirect("/sign-up?error=Error creating account");
  }

  // Verify the user was created
  if (data.user) {
    return redirect(
      "/sign-up?success=Check your email to confirm your account"
    );
  }

  return redirect("/sign-up?error=Error creating account");
}

export async function signOutAction() {
  const supabase = await createClient();

  // Get current user to ensure we have a valid session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  // Revalidate and redirect
  revalidatePath("/", "layout");
  return redirect("/");
}

export async function forgotPasswordAction(formData: FormData) {
  // CSRF verification
  if (!(await verifyCSRF(formData))) {
    return redirect(
      "/forgot-password?error=Invalid security token. Please refresh and try again."
    );
  }

  // Validate input data
  let validatedData;
  try {
    validatedData = extractFormData(formData, forgotPasswordSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return redirect(
        `/forgot-password?error=${encodeURIComponent(firstError.message)}`
      );
    }
    return redirect("/forgot-password?error=Invalid form data");
  }

  const { email } = validatedData;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return redirect("/forgot-password?error=Error sending reset email");
  }

  return redirect(
    "/forgot-password?success=Check your email for reset instructions"
  );
}

export async function resetPasswordAction(formData: FormData) {
  // CSRF verification
  if (!(await verifyCSRF(formData))) {
    return redirect(
      "/reset-password?error=Invalid security token. Please refresh and try again."
    );
  }

  // Validate input data
  let validatedData;
  try {
    validatedData = extractFormData(formData, resetPasswordSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return redirect(
        `/reset-password?error=${encodeURIComponent(firstError.message)}`
      );
    }
    return redirect("/reset-password?error=Invalid form data");
  }

  const { password } = validatedData;
  const supabase = await createClient();

  // Verify user is authenticated before allowing password update
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirect("/sign-in?error=Session expired");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return redirect("/reset-password?error=Error updating password");
  }

  return redirect("/dashboard?success=Password updated successfully");
}

// New action for evidence submission with full validation
export async function submitEvidenceAction(formData: FormData) {
  // CSRF verification
  if (!(await verifyCSRF(formData))) {
    return {
      error: "Invalid security token. Please refresh and try again.",
      success: false,
    };
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: "Authentication required. Please sign in.",
      success: false,
    };
  }

  // Validate evidence data
  let validatedData;
  try {
    // Extract and validate the evidence data
    const rawData: Record<string, any> = {};

    for (const [key, value] of formData.entries()) {
      if (key === "csrf_token") continue; // Skip CSRF token

      // Handle different field types
      if (key.includes("_")) {
        // Handle boolean (as string) fields
        if (
          key.startsWith("has_") ||
          key.startsWith("facing_") ||
          key.startsWith("child_") ||
          key === "consent_given" ||
          key === "regulation_50_attempted"
        ) {
          rawData[key] = value === "on" || value === "true";
        }
        // Handle number fields
        else if (
          key.includes("amount") ||
          key.includes("nights") ||
          key.includes("severity") ||
          key.includes("affected") ||
          key.includes("attendance")
        ) {
          rawData[key] = value === "" ? 0 : parseFloat(value as string) || 0;
        } else {
          rawData[key] = value;
        }
      } else {
        rawData[key] = value;
      }
    }

    // Add required fields
    rawData.user_id = user.id;
    rawData.email = user.email || "";

    validatedData = evidenceSchema.parse(rawData);
  } catch (error) {
    console.error("Validation error:", error);
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        error: `Validation error: ${firstError.message}`,
        success: false,
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    return {
      error: "Invalid form data. Please check your inputs.",
      success: false,
    };
  }

  try {
    // Transform data for database insertion
    const submissionData = transformEvidenceForDatabase(validatedData);

    // Insert into database
    const { data, error } = await supabase
      .from("evidence_submissions")
      .insert(submissionData)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return {
        error: "Failed to save evidence. Please try again.",
        success: false,
      };
    }

    // Log successful submission
    console.log(`Evidence submitted successfully: ${data.id}`);

    return {
      success: true,
      data: {
        id: data.id,
        message: "Evidence submitted successfully",
      },
    };
  } catch (error) {
    console.error("Submission error:", error);
    return {
      error: "An unexpected error occurred. Please try again.",
      success: false,
    };
  }
}

// Action to validate a single field (useful for real-time validation)
export async function validateFieldAction(field: string, value: any) {
  try {
    // Get the field schema from the evidence schema
    const fieldSchema =
      evidenceSchemaBase.shape[field as keyof typeof evidenceSchemaBase.shape];

    if (!fieldSchema) {
      return { valid: false, error: "Unknown field" };
    }

    fieldSchema.parse(value);
    return { valid: true };
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
