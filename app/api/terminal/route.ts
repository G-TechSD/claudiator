import { NextRequest, NextResponse } from "next/server"
import { terminalServer } from "@/lib/terminal-server"
import { generateId } from "@/lib/utils"

// Store for SSE connections
const sseConnections = new Map<string, ReadableStreamDefaultController>()

// POST - Create a new terminal session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      workingDirectory,
      bypassPermissions,
      autoStartClaude = true,  // Default to true
      cols = 80,
      rows = 24
    } = body

    if (!workingDirectory) {
      return NextResponse.json(
        { error: "workingDirectory is required" },
        { status: 400 }
      )
    }

    const sessionId = generateId()

    const { ptyProcess, tmuxSessionName } = terminalServer.spawnTerminal({
      sessionId,
      workingDirectory,
      cols,
      rows,
      useTmux: true,
      bypassPermissions: bypassPermissions || false,
      autoStartClaude,
    })

    // Set up output handler for SSE
    ptyProcess.onData((data) => {
      const controller = sseConnections.get(sessionId)
      if (controller) {
        try {
          const event = `data: ${JSON.stringify({ type: "output", data })}\n\n`
          controller.enqueue(new TextEncoder().encode(event))
        } catch (e) {
          // Controller closed
          sseConnections.delete(sessionId)
        }
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      const controller = sseConnections.get(sessionId)
      if (controller) {
        try {
          const event = `data: ${JSON.stringify({ type: "exit", code: exitCode })}\n\n`
          controller.enqueue(new TextEncoder().encode(event))
          controller.close()
        } catch (e) {
          // Controller already closed
        }
        sseConnections.delete(sessionId)
      }
    })

    return NextResponse.json({
      sessionId,
      tmuxSessionName: tmuxSessionName || `claudiator-${sessionId}`,
      tmuxAvailable: terminalServer.isTmuxAvailable(),
    })
  } catch (error) {
    console.error("[API] Error creating terminal:", error)
    return NextResponse.json(
      { error: "Failed to create terminal" },
      { status: 500 }
    )
  }
}

// PUT - Send input or resize
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, type, data, cols, rows } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    if (type === "input") {
      const success = terminalServer.writeToTerminal(sessionId, data)
      if (!success) {
        return NextResponse.json(
          { error: "Terminal not found" },
          { status: 404 }
        )
      }
    } else if (type === "resize") {
      const success = terminalServer.resizeTerminal(sessionId, cols, rows)
      if (!success) {
        return NextResponse.json(
          { error: "Terminal not found" },
          { status: 404 }
        )
      }
    } else if (type === "reconnect") {
      // Reconnect to existing tmux session
      const tmuxSessionName = body.tmuxSessionName
      if (!tmuxSessionName) {
        return NextResponse.json(
          { error: "tmuxSessionName is required for reconnect" },
          { status: 400 }
        )
      }

      const ptyProcess = terminalServer.reconnectToTmux(
        sessionId,
        tmuxSessionName,
        cols || 80,
        rows || 24
      )

      if (!ptyProcess) {
        return NextResponse.json(
          { error: "Failed to reconnect to tmux session" },
          { status: 404 }
        )
      }

      // Set up output handler for SSE
      ptyProcess.onData((data) => {
        const controller = sseConnections.get(sessionId)
        if (controller) {
          try {
            const event = `data: ${JSON.stringify({ type: "output", data })}\n\n`
            controller.enqueue(new TextEncoder().encode(event))
          } catch (e) {
            sseConnections.delete(sessionId)
          }
        }
      })

      ptyProcess.onExit(({ exitCode }) => {
        const controller = sseConnections.get(sessionId)
        if (controller) {
          try {
            const event = `data: ${JSON.stringify({ type: "exit", code: exitCode })}\n\n`
            controller.enqueue(new TextEncoder().encode(event))
            controller.close()
          } catch (e) {
            // Controller already closed
          }
          sseConnections.delete(sessionId)
        }
      })

      return NextResponse.json({
        reconnected: true,
        sessionId,
        tmuxSessionName,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error updating terminal:", error)
    return NextResponse.json(
      { error: "Failed to update terminal" },
      { status: 500 }
    )
  }
}

// DELETE - Stop a terminal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const killTmux = searchParams.get("killTmux") === "true"

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      )
    }

    // Close SSE connection
    const controller = sseConnections.get(sessionId)
    if (controller) {
      try {
        controller.close()
      } catch (e) {
        // Already closed
      }
      sseConnections.delete(sessionId)
    }

    const success = terminalServer.stopTerminal(sessionId, killTmux)

    return NextResponse.json({ success })
  } catch (error) {
    console.error("[API] Error stopping terminal:", error)
    return NextResponse.json(
      { error: "Failed to stop terminal" },
      { status: 500 }
    )
  }
}

// GET - SSE stream for terminal output
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    )
  }

  // Check if terminal exists
  const terminal = terminalServer.getActiveTerminal(sessionId)
  if (!terminal) {
    return NextResponse.json(
      { error: "Terminal not found" },
      { status: 404 }
    )
  }

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Store controller for this session
      sseConnections.set(sessionId, controller)

      // Send initial connection event
      const event = `data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`
      controller.enqueue(new TextEncoder().encode(event))
    },
    cancel() {
      sseConnections.delete(sessionId)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
