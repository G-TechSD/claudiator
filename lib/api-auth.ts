/**
 * API Route Authentication Helper
 *
 * Validates authentication for API routes.
 * Should be called at the start of each protected API route handler.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  validateToken,
  isSessionAuthenticated,
  parseCookies,
} from "./auth"

export interface AuthResult {
  authenticated: boolean
  error?: NextResponse
}

/**
 * Validate authentication for an API request
 * Returns { authenticated: true } if valid, or { authenticated: false, error: NextResponse } if not
 */
export function validateApiAuth(request: NextRequest): AuthResult {
  // Check session cookie
  const cookieHeader = request.headers.get("cookie")
  const cookies = parseCookies(cookieHeader)
  const sessionId = cookies["claudiator_session"]

  if (sessionId && isSessionAuthenticated(sessionId)) {
    return { authenticated: true }
  }

  // Check X-Claudiator-Token header
  const tokenHeader = request.headers.get("x-claudiator-token")
  if (tokenHeader && validateToken(tokenHeader)) {
    return { authenticated: true }
  }

  // Check token query param (for SSE connections)
  const { searchParams } = new URL(request.url)
  const tokenParam = searchParams.get("token")
  if (tokenParam && validateToken(tokenParam)) {
    return { authenticated: true }
  }

  // Not authenticated
  return {
    authenticated: false,
    error: NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    ),
  }
}

/**
 * Wrapper to require authentication for an API route handler
 * Usage: export const POST = requireAuth(async (request) => { ... })
 */
export function requireAuth<T>(
  handler: (request: NextRequest) => Promise<T>
): (request: NextRequest) => Promise<T | NextResponse> {
  return async (request: NextRequest) => {
    const auth = validateApiAuth(request)
    if (!auth.authenticated) {
      return auth.error!
    }
    return handler(request)
  }
}
