// app/api/health/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database using Prisma
    await prisma.evidenceSubmission.findFirst({
      select: { id: true },
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        services: {
          database: "healthy",
        },
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Database check failed",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
