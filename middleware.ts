import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Refresh the session if it exists
  const { data: { session } } = await supabase.auth.getSession()
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/admin', '/view-submission']
  const url = req.nextUrl.pathname
  
  // If trying to access a protected route without a session, redirect to login
  if (protectedRoutes.some(route => url.startsWith(route)) && !session) {
    const redirectUrl = new URL('/submit-evidence', req.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  return res
}

// Configure which routes use this middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}