import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Sign out the user
  await supabase.auth.signOut();

  // URL to redirect to after sign out
  return NextResponse.redirect(new URL("/", request.url));
}
