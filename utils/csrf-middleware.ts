// utils/csrf-middleware.ts
// Server-side CSRF utilities only
import { NextRequest, NextResponse } from "next/server";
import { CSRFTokenServer } from "./csrf-server";

/**
 * CSRF Configuration interface
 */
interface CSRFConfig {
  tokenName?: string;
  headerName?: string;
  excludePaths?: string[];
}

/**
 * Default CSRF configuration
 */
const defaultConfig: CSRFConfig = {
  tokenName: "csrf_token",
  headerName: "X-CSRF-Token",
  excludePaths: [
    "/api/auth/",
    "/auth/callback",
    "/api/health",
    "/_next/",
    "/favicon.ico",
  ],
};

/**
 * Initialize CSRF token for a user session
 */
export function initializeCSRFToken(response: NextResponse): NextResponse {
  const token = CSRFTokenServer.generate();

  response.cookies.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  // Also set it in a readable cookie for client-side
  response.cookies.set("csrf_token_client", token, {
    httpOnly: false, // Readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return response;
}

/**
 * CSRF protection for API routes
 */
export async function csrfProtection(
  request: NextRequest,
  config: CSRFConfig = defaultConfig
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;

  // Skip CSRF check for excluded paths
  if (
    config.excludePaths?.some((excludePath: string) =>
      path.startsWith(excludePath)
    )
  ) {
    return null;
  }

  // Skip CSRF for GET requests
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }

  // Get token from request
  const headerToken = request.headers.get(config.headerName || "X-CSRF-Token");
  const bodyToken = await getTokenFromBody(request);
  const token = headerToken || bodyToken;

  // Get stored token from cookie
  const cookieToken = request.cookies.get(
    config.tokenName || "csrf_token"
  )?.value;

  // Verify token
  if (!token || !cookieToken || token !== cookieToken) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  return null; // CSRF check passed
}

/**
 * Extract CSRF token from request body
 */
async function getTokenFromBody(request: NextRequest): Promise<string | null> {
  try {
    // Clone the request to avoid consuming the original body
    const clonedRequest = request.clone();
    const contentType = clonedRequest.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const body = await clonedRequest.json();
      return body.csrf_token || body.csrfToken || null;
    }

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      const formData = await clonedRequest.formData();
      return (formData.get("csrf_token") as string) || null;
    }

    if (contentType?.includes("multipart/form-data")) {
      const formData = await clonedRequest.formData();
      return (formData.get("csrf_token") as string) || null;
    }

    return null;
  } catch (error) {
    console.error("Error extracting CSRF token from body:", error);
    return null;
  }
}

/**
 * Validate CSRF token from various sources
 */
export async function validateCSRFToken(
  request: NextRequest,
  config: CSRFConfig = defaultConfig
): Promise<boolean> {
  const path = request.nextUrl.pathname;

  // Skip validation for excluded paths
  if (
    config.excludePaths?.some((excludePath: string) =>
      path.startsWith(excludePath)
    )
  ) {
    return true;
  }

  // Skip validation for GET requests
  if (request.method === "GET" || request.method === "HEAD") {
    return true;
  }

  const headerToken = request.headers.get(config.headerName || "X-CSRF-Token");
  const bodyToken = await getTokenFromBody(request);
  const token = headerToken || bodyToken;

  const cookieToken = request.cookies.get(
    config.tokenName || "csrf_token"
  )?.value;

  return !!(token && cookieToken && token === cookieToken);
}

/**
 * Generate CSRF protection response
 */
export function csrfErrorResponse(
  message: string = "Invalid CSRF token"
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: "CSRF_TOKEN_INVALID",
      timestamp: new Date().toISOString(),
    },
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Export the config type for use in other files
 */
export type { CSRFConfig };
