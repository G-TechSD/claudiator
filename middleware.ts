import { NextRequest, NextResponse } from "next/server"

// Localhost-only mode (default: true for security)
// Set CLAUDIATOR_ALLOW_REMOTE=true to allow remote access
const ALLOW_REMOTE = process.env.CLAUDIATOR_ALLOW_REMOTE === "true"

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

// Check if request is from localhost
function isLocalhost(request: NextRequest): boolean {
  const host = request.headers.get("host") || ""
  const forwardedFor = request.headers.get("x-forwarded-for")

  // Check host header
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return true
  }

  // If behind a proxy, check x-forwarded-for
  if (forwardedFor) {
    const clientIp = forwardedFor.split(",")[0].trim()
    if (clientIp === "127.0.0.1" || clientIp === "::1") {
      return true
    }
  }

  return false
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

  // Check localhost-only mode FIRST (before any other checks)
  if (!ALLOW_REMOTE && !isLocalhost(request)) {
    // Allow health check from anywhere for monitoring
    if (pathname === "/api/health") {
      return NextResponse.next()
    }

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Access Denied - Claudiator</title></head>
<body style="font-family: system-ui; background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
  <div style="text-align: center; max-width: 500px; padding: 2rem;">
    <h1 style="color: #f87171;">Remote Access Disabled</h1>
    <p style="color: #a1a1aa;">Claudiator is running in localhost-only mode for security.</p>
    <p style="color: #a1a1aa;">To enable remote access, set the environment variable:</p>
    <code style="display: block; background: #1f1f1f; padding: 1rem; border-radius: 8px; margin: 1rem 0; color: #4ade80;">CLAUDIATOR_ALLOW_REMOTE=true</code>
    <p style="color: #fbbf24; font-size: 0.875rem;">WARNING: Only enable remote access on trusted networks. SSL/HTTPS is not supported - use a reverse proxy for secure remote access.</p>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "Content-Type": "text/html" },
      }
    )
  }

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
