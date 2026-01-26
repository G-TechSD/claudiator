import { NextRequest, NextResponse } from "next/server"
import { terminalServer } from "@/lib/terminal-server"
import { validateApiAuth } from "@/lib/api-auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// GET - List all sessions with detailed info
export async function GET(request: NextRequest) {
  // Validate authentication
  const auth = validateApiAuth(request)
  if (!auth.authenticated) return auth.error!

  try {
    const tmuxSessions = terminalServer.getTmuxSessionsInfo()
    const activeTerminals = Array.from(terminalServer.getAllActiveTerminals().keys())

    return NextResponse.json({
      tmuxSessions,
      activeTerminals,
      tmuxAvailable: terminalServer.isTmuxAvailable(),
    })
  } catch (error) {
    console.error("[API] Error listing sessions:", error)
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 }
    )
  }
}

// DELETE - Kill session(s)
export async function DELETE(request: NextRequest) {
  // Validate authentication
  const auth = validateApiAuth(request)
  if (!auth.authenticated) return auth.error!

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("id")
    const tmuxName = searchParams.get("tmuxName")
    const killAll = searchParams.get("all") === "true"

    if (killAll) {
      // Kill all claudiator tmux sessions
      const killed = terminalServer.killAllTmuxSessions()
      return NextResponse.json({ killed, message: `Killed ${killed} tmux sessions` })
    }

    if (tmuxName) {
      // Kill specific tmux session by name
      const killed = terminalServer.killTmuxSession(tmuxName)
      return NextResponse.json({ killed, tmuxName })
    }

    if (sessionId) {
      // Kill specific session by ID
      const tmuxSessionName = terminalServer.getTmuxSessionName(sessionId)
      const killed = terminalServer.killTmuxSession(tmuxSessionName)
      terminalServer.stopTerminal(sessionId, true)
      return NextResponse.json({ killed, sessionId })
    }

    return NextResponse.json(
      { error: "Either 'id', 'tmuxName', or 'all=true' is required" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[API] Error deleting session:", error)
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    )
  }
}
