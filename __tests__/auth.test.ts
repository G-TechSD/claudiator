import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

// Mock the file system for testing
const TEST_STORAGE_DIR = path.join(process.cwd(), '.test-storage-claudiator')
const TEST_TOKEN_FILE = path.join(TEST_STORAGE_DIR, 'test-token.json')

// Token utilities (mirroring auth.ts)
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex')
}

function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=')
    }
  })
  return cookies
}

describe('Token Generation', () => {
  it('should generate a 64-character hex token', () => {
    const token = generateToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(token.length).toBe(64)
  })

  it('should generate unique tokens', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken())
    }
    expect(tokens.size).toBe(100)
  })
})

describe('Session ID Generation', () => {
  it('should generate a 32-character hex session ID', () => {
    const sessionId = generateSessionId()
    expect(sessionId).toMatch(/^[a-f0-9]{32}$/)
    expect(sessionId.length).toBe(32)
  })

  it('should generate unique session IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('Cookie Parsing', () => {
  it('should parse single cookie', () => {
    const cookies = parseCookies('session=abc123')
    expect(cookies).toEqual({ session: 'abc123' })
  })

  it('should parse multiple cookies', () => {
    const cookies = parseCookies('session=abc123; token=xyz789; user=john')
    expect(cookies).toEqual({
      session: 'abc123',
      token: 'xyz789',
      user: 'john',
    })
  })

  it('should handle cookies with = in value', () => {
    const cookies = parseCookies('data=base64==encoded')
    expect(cookies).toEqual({ data: 'base64==encoded' })
  })

  it('should handle empty cookie header', () => {
    expect(parseCookies('')).toEqual({})
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
  })

  it('should handle whitespace', () => {
    const cookies = parseCookies('  session=abc123  ;  token=xyz789  ')
    expect(cookies).toEqual({
      session: 'abc123',
      token: 'xyz789',
    })
  })
})

describe('Token File Persistence', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    if (fs.existsSync(TEST_STORAGE_DIR)) {
      fs.rmSync(TEST_STORAGE_DIR, { recursive: true })
    }
  })

  it('should create storage directory', () => {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true })
    expect(fs.existsSync(TEST_STORAGE_DIR)).toBe(true)
  })

  it('should persist token to file', () => {
    fs.mkdirSync(TEST_STORAGE_DIR, { recursive: true })
    const token = generateToken()
    const data = {
      token,
      createdAt: new Date().toISOString(),
    }
    fs.writeFileSync(TEST_TOKEN_FILE, JSON.stringify(data, null, 2))
    
    const loaded = JSON.parse(fs.readFileSync(TEST_TOKEN_FILE, 'utf-8'))
    expect(loaded.token).toBe(token)
    expect(loaded.createdAt).toBeDefined()
  })
})

describe('Session Management', () => {
  const authenticatedSessions = new Set<string>()

  it('should add and check sessions', () => {
    const sessionId = generateSessionId()
    authenticatedSessions.add(sessionId)
    expect(authenticatedSessions.has(sessionId)).toBe(true)
  })

  it('should remove sessions', () => {
    const sessionId = generateSessionId()
    authenticatedSessions.add(sessionId)
    authenticatedSessions.delete(sessionId)
    expect(authenticatedSessions.has(sessionId)).toBe(false)
  })

  it('should handle multiple sessions', () => {
    const sessions = Array.from({ length: 5 }, () => generateSessionId())
    sessions.forEach(s => authenticatedSessions.add(s))
    
    expect(authenticatedSessions.size).toBeGreaterThanOrEqual(5)
    sessions.forEach(s => expect(authenticatedSessions.has(s)).toBe(true))
  })
})
