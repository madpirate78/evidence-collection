import { NextResponse } from "next/server";
import { cleanupOldRateLimitRecords } from "@/lib/rate-limiter";

// GET /api/cleanup - Cleanup old rate limit records (older than 7 days)
// Can be triggered manually or via cron job
export async function GET() {
  try {
    const result = await cleanupOldRateLimitRecords();

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `Deleted ${result.deleted} old rate limit records`,
    });
  } catch (error) {
    console.error("Cleanup API error:", error);
    return NextResponse.json(
      { success: false, error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
