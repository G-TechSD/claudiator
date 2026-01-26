import { NextRequest, NextResponse } from "next/server"
import { terminalServer } from "@/lib/terminal-server"

// GET - List all sessions
export async function GET() {
  try {
    const tmuxSessions = terminalServer.listTmuxSessions()
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
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("id")
    const killAll = searchParams.get("all") === "true"

    if (killAll) {
      // Kill all claudiator tmux sessions
      const killed = terminalServer.killAllTmuxSessions()
      return NextResponse.json({ killed })
    }

    if (sessionId) {
      // Kill specific session
      const tmuxSessionName = terminalServer.getTmuxSessionName(sessionId)
      const killed = terminalServer.killTmuxSession(tmuxSessionName)
      terminalServer.stopTerminal(sessionId, true)
      return NextResponse.json({ killed })
    }

    return NextResponse.json(
      { error: "Either 'id' or 'all=true' is required" },
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
