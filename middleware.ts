// middleware.ts - Complete version with CSRF protection
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { csrfProtection, initializeCSRFToken } from "./utils/csrf-middleware";

// Route configurations
const ROUTE_CONFIG = {
  public: ["/", "/about", "/statistics", "/terms", "/privacy"],
  auth: [
    "/sign-in",
    "/sign-up",
    "/auth",
    "/reset-password",
    "/forgot-password",
  ],
  protected: ["/dashboard", "/statement-portal", "/view-submission"],
  admin: ["/admin"],
};

// Cache for admin status with cleanup
const adminCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const ADMIN_CACHE_TTL = 300000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// Clean up old cache entries
function cleanupAdminCache() {
  const now = Date.now();
  const entries = Array.from(adminCache.entries());

  for (const [key, value] of entries) {
    if (now - value.timestamp > ADMIN_CACHE_TTL) {
      adminCache.delete(key);
    }
  }

  if (adminCache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(adminCache.keys());
    const oldestKeys = keys.slice(0, adminCache.size - MAX_CACHE_SIZE);
    oldestKeys.forEach((key) => adminCache.delete(key));
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;

  // Initialize CSRF token for ALL users on auth pages
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up")) {
    if (!request.cookies.get("csrf_token")) {
      response = initializeCSRFToken(response);
    }
  }

  // Skip middleware for static assets
  if (
    path.startsWith("/_next/") ||
    path.includes(".") // files like favicon.ico, images, etc.
  ) {
    return response;
  }

  // Determine route type
  const isPublicRoute = ROUTE_CONFIG.public.some(
    (route) => path === route || path.startsWith(route + "/")
  );
  const isAuthRoute = ROUTE_CONFIG.auth.some((route) => path.startsWith(route));
  const isProtectedRoute = ROUTE_CONFIG.protected.some((route) =>
    path.startsWith(route)
  );
  const isAdminRoute = ROUTE_CONFIG.admin.some((route) =>
    path.startsWith(route)
  );

  // Skip for truly public routes
  if (isPublicRoute && !isProtectedRoute && !isAdminRoute) {
    return response;
  }

  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    ////////////////////////////////////////////////////////////////////
    // Get user session// or session ???????????????
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    const user = session?.user;

    // Initialize CSRF token for authenticated users
    if (!request.cookies.get("csrf_token")) {
      response = initializeCSRFToken(response);
    }

    // Handle auth routes
    if (isAuthRoute) {
      if (user && !error) {
        const redirectTo =
          request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
      return response;
    }

    // Check authentication for protected routes
    if (isProtectedRoute || isAdminRoute) {
      if (!user || error) {
        const url = new URL("/sign-in", request.url);
        url.searchParams.set("redirectTo", path);
        return NextResponse.redirect(url);
      }
    }

    // Handle admin routes
    if (isAdminRoute && user) {
      // Clean up cache periodically
      if (Math.random() < 0.01) {
        try {
          cleanupAdminCache();
        } catch (cleanupError) {
          console.error("Cache cleanup failed:", cleanupError);
          // Continue without failing
        }

        let isAdmin = false;

        // Check cache first
        const cached = adminCache.get(user.id);
        if (cached && Date.now() - cached.timestamp < ADMIN_CACHE_TTL) {
          isAdmin = cached.isAdmin;
        } else {
          // Check database
          try {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .single();

            isAdmin =
              roleData?.role === "admin" || roleData?.role === "super_admin";

            // Update cache
            adminCache.set(user.id, { isAdmin, timestamp: Date.now() });
          } catch (roleError) {
            console.error("Error checking admin role:", roleError);
            isAdmin = false;
          }
        }

        if (!isAdmin) {
          // Log unauthorized access attempt
          try {
            await supabase.from("admin_activity_logs").insert({
              admin_id: user.id,
              action: "unauthorized_admin_access_attempt",
              details: {
                path,
                timestamp: new Date().toISOString(),
                ip:
                  request.headers.get("x-forwarded-for") ||
                  request.headers.get("x-real-ip") ||
                  "unknown",
                userAgent: request.headers.get("user-agent"),
              },
            });
          } catch (logError) {
            console.error("Failed to log unauthorized access:", logError);
          }

          return NextResponse.redirect(new URL("/403", request.url));
        }

        // Log successful admin access
        try {
          await supabase.from("admin_activity_logs").insert({
            admin_id: user.id,
            action: "admin_page_access",
            details: {
              path,
              timestamp: new Date().toISOString(),
              ip:
                request.headers.get("x-forwarded-for") ||
                request.headers.get("x-real-ip") ||
                "unknown",
              userAgent: request.headers.get("user-agent"),
            },
          });
        } catch (logError) {
          console.error("Failed to log admin access:", logError);
        }
      }
    }

    // Add security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none';"
    );

    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    // Add CSRF token to response headers for SPAs
    const csrfToken = request.cookies.get("csrf_token")?.value;
    if (csrfToken) {
      response.headers.set("X-CSRF-Token", csrfToken);
    }

    // Add user info to request headers for server components
    if (user) {
      response.headers.set("x-user-id", user.id);
      response.headers.set("x-user-email", user.email || "");
    }

    return response;
  } catch (middlewareError) {
    console.error("Middleware error:", middlewareError);

    // Don't block public routes on errors
    if (isPublicRoute) {
      return response;
    }

    // For protected routes, redirect to sign-in on error
    if (isProtectedRoute || isAdminRoute) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("redirectTo", path);
      return NextResponse.redirect(url);
    }

    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
