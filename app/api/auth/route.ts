import { NextRequest, NextResponse } from "next/server"
import {
  validateToken,
  generateSessionId,
  addAuthenticatedSession,
  removeAuthenticatedSession,
  parseCookies,
  isSessionAuthenticated,
  getAuthInfo,
  regenerateToken,
} from "@/lib/auth"

// Force dynamic
export const dynamic = "force-dynamic"

/**
 * POST - Login with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    if (!validateToken(token)) {
      console.log("[Auth] Invalid token attempt")
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    // Create session
    const sessionId = generateSessionId()
    addAuthenticatedSession(sessionId)

    console.log("[Auth] Login successful, session:", sessionId.substring(0, 8))

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
    })

    // Set session cookie (24 hours)
    response.cookies.set("claudiator_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Logout
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie")
    const cookies = parseCookies(cookieHeader)
    const sessionId = cookies["claudiator_session"]

    if (sessionId) {
      removeAuthenticatedSession(sessionId)
      console.log("[Auth] Logout, session:", sessionId.substring(0, 8))
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out",
    })

    // Clear session cookie
    response.cookies.delete("claudiator_session")

    return response
  } catch (error) {
    console.error("[Auth] Logout error:", error)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}

/**
 * GET - Check auth status
 */
export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie")
    const cookies = parseCookies(cookieHeader)
    const sessionId = cookies["claudiator_session"]

    const isAuthenticated = sessionId ? isSessionAuthenticated(sessionId) : false
    const authInfo = getAuthInfo()

    return NextResponse.json({
      authenticated: isAuthenticated,
      ...authInfo,
    })
  } catch (error) {
    console.error("[Auth] Status check error:", error)
    return NextResponse.json(
      { error: "Failed to check auth status" },
      { status: 500 }
    )
  }
}

/**
 * PUT - Regenerate token (requires current auth)
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie")
    const cookies = parseCookies(cookieHeader)
    const sessionId = cookies["claudiator_session"]

    if (!sessionId || !isSessionAuthenticated(sessionId)) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const newToken = regenerateToken()

    console.log("[Auth] Token regenerated")

    // Clear the current session (user will need to re-login)
    const response = NextResponse.json({
      success: true,
      message: "Token regenerated. Please login with the new token.",
      tokenPreview: newToken.substring(0, 8) + "...",
    })

    response.cookies.delete("claudiator_session")

    return response
  } catch (error) {
    console.error("[Auth] Token regeneration error:", error)
    return NextResponse.json(
      { error: "Failed to regenerate token" },
      { status: 500 }
    )
  }
}
