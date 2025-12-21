import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TEMPORARY DEMO AUTH - COMMENTED OUT FOR PUBLIC ACCESS
/*
function checkDemoAuth(request: NextRequest): boolean {
  const demoUsername = process.env.DEMO_USERNAME
  const demoPassword = process.env.DEMO_PASSWORD
  
  // If no demo credentials set, allow access (for local dev)
  if (!demoUsername || !demoPassword) {
    return true
  }
  
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }
  
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
  const [username, password] = credentials.split(':')
  
  return username === demoUsername && password === demoPassword
}
*/

export function middleware(request: NextRequest) {
  // TEMPORARY DEMO AUTH - COMMENTED OUT FOR PUBLIC ACCESS
  /*
  const isDemoAuthEnabled = process.env.DEMO_USERNAME && process.env.DEMO_PASSWORD

  if (isDemoAuthEnabled) {
    // Only protect the home page and main routes, not API endpoints
    const isProtectedRoute = request.nextUrl.pathname === '/' ||
                            request.nextUrl.pathname.startsWith('/statement-portal') ||
                            request.nextUrl.pathname.startsWith('/statistics')

    if (isProtectedRoute && !checkDemoAuth(request)) {
      return new NextResponse('Demo Access Required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Demo Access"',
          'Content-Type': 'text/plain',
        },
      })
    }
  }
  */

  // Check if this is an embed request
  const isEmbed = request.nextUrl.searchParams.get('embed') === 'true'
  const isEmbeddablePath = request.nextUrl.pathname.startsWith('/statement-portal') ||
                           request.nextUrl.pathname.startsWith('/statistics')

  // Existing CSRF protection and security headers
  const response = NextResponse.next()

  // Generate and set CSRF token if not exists
  const existingToken = request.cookies.get('csrf_token')?.value
  if (!existingToken) {
    const csrfToken = crypto.randomUUID().replace(/-/g, '')
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === 'production',
      // Use 'none' for embed mode to allow cross-origin iframe cookies (requires secure)
      sameSite: isEmbed ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
  }

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Iframe embedding headers - configurable via ALLOWED_EMBED_ORIGIN env var
  const allowedEmbedOrigin = process.env.ALLOWED_EMBED_ORIGIN
  if (isEmbed && isEmbeddablePath && allowedEmbedOrigin) {
    // Allow iframe embedding from the configured parent site
    const frameAncestors = `'self' https://${allowedEmbedOrigin} https://*.${allowedEmbedOrigin}`
    response.headers.set(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors ${frameAncestors};`
    )
    // Don't set X-Frame-Options for embed mode (CSP frame-ancestors takes precedence)
  } else {
    // Block iframe embedding for non-embed requests
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
    )
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}