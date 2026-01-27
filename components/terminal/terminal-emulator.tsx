"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"

interface TerminalEmulatorProps {
  sessionId: string
  tmuxSessionName?: string
  onReady?: () => void
  onExit?: (code: number) => void
  className?: string
}

export function TerminalEmulator({
  sessionId,
  tmuxSessionName,
  onReady,
  onExit,
  className,
}: TerminalEmulatorProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Send input to terminal
  const sendInput = useCallback(
    async (data: string) => {
      try {
        await fetch("/api/terminal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            type: "input",
            data,
          }),
        })
      } catch (error) {
        console.error("Failed to send input:", error)
      }
    },
    [sessionId]
  )

  // Send resize to terminal
  const sendResize = useCallback(
    async (cols: number, rows: number) => {
      try {
        await fetch("/api/terminal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            type: "resize",
            cols,
            rows,
          }),
        })
      } catch (error) {
        console.error("Failed to send resize:", error)
      }
    },
    [sessionId]
  )

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, monospace',
      scrollback: 10000,
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#22c55e",
        cursorAccent: "#0a0a0a",
        selectionBackground: "rgba(34, 197, 94, 0.3)",
        black: "#18181b",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#71717a",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#fafafa",
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminal.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle terminal input
    terminal.onData((data) => {
      sendInput(data)
    })

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      sendResize(cols, rows)
    })

    // If tmuxSessionName is provided, send a reconnect command first
    if (tmuxSessionName) {
      fetch("/api/terminal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "reconnect",
          tmuxSessionName,
          cols: terminal.cols,
          rows: terminal.rows,
        }),
      }).catch((err) => console.error("Failed to reconnect to tmux:", err))
    }

    // Connect to SSE stream for output
    const eventSource = new EventSource(`/api/terminal?sessionId=${sessionId}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === "connected") {
          setIsConnected(true)
          onReady?.()
        } else if (data.type === "output") {
          terminal.write(data.data)
        } else if (data.type === "exit") {
          onExit?.(data.code)
        }
      } catch (error) {
        console.error("Failed to parse SSE message:", error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
    }

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }
    window.addEventListener("resize", handleResize)

    // Initial resize after a short delay
    setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit()
        sendResize(xtermRef.current.cols, xtermRef.current.rows)
      }
    }, 100)

    return () => {
      window.removeEventListener("resize", handleResize)
      eventSource.close()
      terminal.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
      eventSourceRef.current = null
    }
  }, [sessionId, tmuxSessionName, sendInput, sendResize, onReady, onExit])

  // Refit when container size changes
  const fit = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit()
      sendResize(xtermRef.current.cols, xtermRef.current.rows)
    }
  }, [sendResize])

  // Focus terminal
  const focus = useCallback(() => {
    xtermRef.current?.focus()
  }, [])

  // Clear terminal
  const clear = useCallback(() => {
    xtermRef.current?.clear()
  }, [])

  // Expose methods
  useEffect(() => {
    const el = terminalRef.current
    if (el) {
      ;(el as unknown as { fit: () => void }).fit = fit
      ;(el as unknown as { focus: () => void }).focus = focus
      ;(el as unknown as { clear: () => void }).clear = clear
    }
  }, [fit, focus, clear])

  return (
    <div
      ref={terminalRef}
      className={className}
      style={{ height: "100%", width: "100%" }}
      data-connected={isConnected}
    />
  )
}
