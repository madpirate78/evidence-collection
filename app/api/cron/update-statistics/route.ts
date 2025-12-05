// app/api/cron/update-statistics/route.ts - Daily statistics cache update cron job
import { NextRequest, NextResponse } from 'next/server';
import { StatisticsCache } from '@/lib/statistics-cache';

/**
 * Cron job endpoint to update statistics cache daily
 * Called by Vercel Cron or external scheduler
 */
export async function POST(request: NextRequest) {
  try {
    
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_AUTH_KEY || process.env.CRON_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('❌ CRON_AUTH_KEY not configured');
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: 'CRON_AUTH_KEY not configured'
        },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('❌ Invalid or missing authorization header');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Invalid or missing authorization header' 
        },
        { status: 401 }
      );
    }
    
    // Get cache info before update
    const beforeExists = await StatisticsCache.exists();
    const beforeLastUpdated = beforeExists ? await StatisticsCache.getLastUpdated() : null;
    
    // Update cache from database
    const startTime = Date.now();
    const result = await StatisticsCache.updateFromDatabase();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      
      const afterLastUpdated = await StatisticsCache.getLastUpdated();
      
      return NextResponse.json({
        success: true,
        message: 'Statistics cache updated successfully',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        cache_info: {
          before: {
            existed: beforeExists,
            last_updated: beforeLastUpdated?.toISOString() || null,
          },
          after: {
            last_updated: afterLastUpdated.toISOString(),
            source: 'database',
          }
        },
        statistics: {
          total_submissions: result.data?.total_submissions || 0,
          total_children_affected: result.data?.total_children_affected || 0,
          last_submission: result.data?.last_submission || null,
        }
      });
    } else {
      console.error(`❌ Failed to update statistics cache: ${result.error}`);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to update statistics cache',
        error: result.error,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        cache_info: {
          before: {
            existed: beforeExists,
            last_updated: beforeLastUpdated?.toISOString() || null,
          },
          fallback_used: true,
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('💥 Cron job error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: 'Cron job failed with unexpected error',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * Health check endpoint for the cron job
 */
export async function GET() {
  try {
    const cacheExists = await StatisticsCache.exists();
    const lastUpdated = cacheExists ? await StatisticsCache.getLastUpdated() : null;
    
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const isStale = lastUpdated ? (now.getTime() - lastUpdated.getTime()) > oneDay : true;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: now.toISOString(),
      cache: {
        exists: cacheExists,
        last_updated: lastUpdated?.toISOString() || null,
        is_stale: isStale,
        age_hours: lastUpdated ? Math.round((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)) : null,
      },
      next_update: 'Daily at 2:00 AM UTC',
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}

/**
 * Block other HTTP methods
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for cron updates.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for cron updates.' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for cron updates.' },
    { status: 405 }
  );
}