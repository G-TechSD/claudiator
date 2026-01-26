"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { TerminalEmulator } from "@/components/terminal/terminal-emulator"
import { Button } from "@/components/ui/button"
import { Terminal, RotateCcw, X } from "lucide-react"

export default function PopOutTerminalPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const sessionId = params.id as string
  const tmuxSessionName = searchParams.get("tmuxSessionName") || ""
  const label = searchParams.get("label") || "Terminal"

  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  // Reconnect to existing tmux session
  const reconnect = useCallback(async () => {
    if (!sessionId || !tmuxSessionName) return

    setIsReconnecting(true)
    try {
      const response = await fetch("/api/terminal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          type: "reconnect",
          tmuxSessionName,
          cols: 80,
          rows: 24,
        }),
      })

      if (response.ok) {
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Failed to reconnect:", error)
    } finally {
      setIsReconnecting(false)
    }
  }, [sessionId, tmuxSessionName])

  // Auto-reconnect on mount
  useEffect(() => {
    reconnect()
  }, [reconnect])

  // Notify parent window when closing
  const handleClose = useCallback(() => {
    window.close()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-white">{label}</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reconnect}
            disabled={isReconnecting}
            className="text-zinc-400 hover:text-white"
          >
            <RotateCcw
              className={`h-4 w-4 mr-1 ${isReconnecting ? "animate-spin" : ""}`}
            />
            Reconnect
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </header>

      {/* Terminal */}
      <div className="flex-1">
        {isConnected ? (
          <TerminalEmulator
            sessionId={sessionId}
            tmuxSessionName={tmuxSessionName}
            onReady={() => setIsConnected(true)}
            onExit={() => setIsConnected(false)}
            className="h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Terminal className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 mb-4">
                {isReconnecting
                  ? "Reconnecting to tmux session..."
                  : "Disconnected from terminal"}
              </p>
              <Button onClick={reconnect} disabled={isReconnecting}>
                <RotateCcw
                  className={`h-4 w-4 mr-2 ${isReconnecting ? "animate-spin" : ""}`}
                />
                Reconnect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#18181b] border-t border-[#27272a] text-xs text-zinc-500">
        <span>Session: {sessionId.substring(0, 8)}</span>
        <span>tmux: {tmuxSessionName}</span>
      </div>
    </div>
  )
}
