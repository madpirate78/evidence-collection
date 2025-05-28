import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();

  // Sign out on the server
  await supabase.auth.signOut();

  // Clear all cookies and redirect
  const response = NextResponse.redirect(
    new URL(
      "/sign-in",
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    )
  );

  // Clear any auth cookies
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");

  return response;
}
