import { NextRequest, NextResponse } from "next/server"

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon.ico",
]

// Check if path is public
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

// Parse cookies from header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=")
    if (name && rest.length > 0) {
      cookies[name] = rest.join("=")
    }
  })
  return cookies
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie
  const cookieHeader = request.headers.get("cookie")
  const cookies = parseCookies(cookieHeader)
  const sessionId = cookies["claudiator_session"]

  // Check for token in header (for API calls)
  const tokenHeader = request.headers.get("x-claudiator-token")

  // Check for token in query param (for SSE connections)
  const tokenParam = request.nextUrl.searchParams.get("token")

  // Validate authentication
  // Note: We can't call the auth module directly in edge middleware,
  // so we just check for presence of session/token here.
  // The actual validation happens in the API routes.
  const hasSession = !!sessionId
  const hasToken = !!tokenHeader || !!tokenParam

  if (!hasSession && !hasToken) {
    // For API routes, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // For pages, redirect to login
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    loginUrl.searchParams.set("error", "required")
    return NextResponse.redirect(loginUrl)
  }

  // For requests with token header/param, validate in the route handler
  // For session cookies, we trust them here but validate in routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
