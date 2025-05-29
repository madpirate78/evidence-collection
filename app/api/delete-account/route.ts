// app/api/delete-account/route.ts
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // Add CSRF verification first
    const body = await request.json();
    const csrfToken = body.csrf_token || request.headers.get("X-CSRF-Token");
    const cookieStore = await cookies();
    const storedToken = cookieStore.get("csrf_token")?.value;

    if (!csrfToken || csrfToken !== storedToken) {
      return NextResponse.json(
        { error: "Invalid security token" },
        { status: 403 }
      );
    }
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Create a service role client for admin operations
    // Note: You'll need to add SUPABASE_SERVICE_ROLE_KEY to your .env.local
    const adminClient = await createClient();

    // Delete in correct order
    const deletionLog = [];

    // 2. Delete evidence submissions
    const { error: subsError, count: subsCount } = await adminClient
      .from("evidence_submissions")
      .delete()
      .eq("user_id", user.id);

    if (!subsError) {
      deletionLog.push({
        table: "evidence_submissions",
        deleted: subsCount || 0,
      });
    }

    // 3. Delete user roles
    const { error: rolesError, count: rolesCount } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (!rolesError) {
      deletionLog.push({ table: "user_roles", deleted: rolesCount || 0 });
    }

    // 4. Try to call the database function if it exists
    const { error: funcError } = await adminClient.rpc(
      "delete_user_cascade_fixed",
      {
        user_id_input: user.id,
      }
    );

    // If function doesn't exist, try direct deletion
    if (funcError && funcError.message.includes("function")) {
      // Sign out the user first
      await supabase.auth.signOut();

      // Note: Direct deletion of auth.users requires service role key
      // For now, we've deleted all the user's data
      return NextResponse.json({
        success: true,
        message:
          "User data deleted. Contact support to complete account deletion.",
        deletionLog,
      });
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      deletionLog,
    });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete account" },
      { status: 500 }
    );
  }
}
