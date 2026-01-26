/**
 * Claudiator Authentication Module
 *
 * Provides token-based authentication for the standalone Claudiator app.
 * - Generates a random access token on first run
 * - Stores token in .local-storage/claudiator-token.json
 * - Validates tokens from headers, cookies, or query params
 */

import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"

// Storage directory and file paths
const STORAGE_DIR = path.join(process.cwd(), ".local-storage")
const TOKEN_FILE = path.join(STORAGE_DIR, "claudiator-token.json")

// Token data structure
interface TokenData {
  token: string
  createdAt: string
  lastUsedAt?: string
}

// Session data (in-memory)
const authenticatedSessions = new Set<string>()

/**
 * Ensure storage directory exists
 */
function ensureStorageDir(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true })
  }
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Load or create the access token
 */
export function loadOrCreateToken(): string {
  ensureStorageDir()

  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData
      return data.token
    }
  } catch (err) {
    console.error("[Claudiator Auth] Error loading token, generating new one:", err)
  }

  // Generate new token
  const token = generateToken()
  const data: TokenData = {
    token,
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2))

  console.log("")
  console.log("╔══════════════════════════════════════════════════════════════╗")
  console.log("║                    CLAUDIATOR ACCESS TOKEN                    ║")
  console.log("╠══════════════════════════════════════════════════════════════╣")
  console.log("║  A new access token has been generated.                       ║")
  console.log("║                                                               ║")
  console.log(`║  ${token.substring(0, 32)}  ║`)
  console.log(`║  ${token.substring(32)}                                  ║`)
  console.log("║                                                               ║")
  console.log("║  This token is required to access Claudiator.                 ║")
  console.log("║  It is saved in: .local-storage/claudiator-token.json         ║")
  console.log("╚══════════════════════════════════════════════════════════════╝")
  console.log("")

  return token
}

/**
 * Get the current access token (does not create if missing)
 */
export function getAccessToken(): string | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData
      return data.token
    }
  } catch {
    // Ignore errors
  }
  return null
}

/**
 * Regenerate the access token
 */
export function regenerateToken(): string {
  ensureStorageDir()

  const token = generateToken()
  const data: TokenData = {
    token,
    createdAt: new Date().toISOString(),
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2))

  // Clear all existing sessions
  authenticatedSessions.clear()

  console.log("[Claudiator Auth] Token regenerated")
  return token
}

/**
 * Validate an access token
 */
export function validateToken(token: string): boolean {
  const validToken = getAccessToken()
  return validToken !== null && token === validToken
}

/**
 * Add an authenticated session
 */
export function addAuthenticatedSession(sessionId: string): void {
  authenticatedSessions.add(sessionId)
}

/**
 * Remove an authenticated session
 */
export function removeAuthenticatedSession(sessionId: string): void {
  authenticatedSessions.delete(sessionId)
}

/**
 * Check if a session is authenticated
 */
export function isSessionAuthenticated(sessionId: string): boolean {
  return authenticatedSessions.has(sessionId)
}

/**
 * Parse cookies from a cookie header string
 */
export function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
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

/**
 * Check if a request is authenticated
 * Checks in order: session cookie, X-Claudiator-Token header, token query param
 */
export function isRequestAuthenticated(request: {
  headers: { get: (name: string) => string | null }
  url: string
}): boolean {
  // Check session cookie
  const cookieHeader = request.headers.get("cookie")
  const cookies = parseCookies(cookieHeader)
  const sessionId = cookies["claudiator_session"]

  if (sessionId && isSessionAuthenticated(sessionId)) {
    return true
  }

  // Check X-Claudiator-Token header
  const tokenHeader = request.headers.get("x-claudiator-token")
  if (tokenHeader && validateToken(tokenHeader)) {
    return true
  }

  // Check token query param (for iframe/initial load)
  try {
    const url = new URL(request.url)
    const tokenParam = url.searchParams.get("token")
    if (tokenParam && validateToken(tokenParam)) {
      return true
    }
  } catch {
    // Invalid URL, ignore
  }

  return false
}

/**
 * Get auth info for display (masked token)
 */
export function getAuthInfo(): {
  hasToken: boolean
  tokenPreview: string | null
  createdAt: string | null
  sessionCount: number
} {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as TokenData
      return {
        hasToken: true,
        tokenPreview: data.token.substring(0, 8) + "..." + data.token.substring(56),
        createdAt: data.createdAt,
        sessionCount: authenticatedSessions.size,
      }
    }
  } catch {
    // Ignore errors
  }
  return {
    hasToken: false,
    tokenPreview: null,
    createdAt: null,
    sessionCount: 0,
  }
}

// Initialize token on module load (server-side only)
if (typeof window === "undefined") {
  loadOrCreateToken()
}
